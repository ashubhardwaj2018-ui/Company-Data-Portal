/**
 * importProcessor.ts — Phase 2
 *
 * Streaming XML / batch XLSX importer that runs as a background job.
 * - XML: SAX streaming — never loads the full file into RAM
 * - XLSX/CSV: xlsx.readFile (existing approach) wrapped in background job
 * - Batches of BATCH_SIZE records are upserted then the batch is cleared
 * - Progress is written to import_jobs after every batch
 * - Temp file is deleted when done (success or failure)
 */

import * as fs from "fs";
// sax is a CJS module — import default to avoid require() in ESM scope
import saxLib from "sax";
const sax = saxLib as any;
// CJS/ESM mismatch: xlsx must be default-imported or readFile is undefined (same as sax)
import xlsxLib from "xlsx";
const xlsx = xlsxLib as any;
import { storage } from "./storage";
import { insertCompanySchema, type InsertCompany } from "@shared/schema";

const BATCH_SIZE = 2_000;

// ── Field mapping helpers ─────────────────────────────────────────────────────

function g(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return String(v).trim();
  }
  return undefined;
}

/** Normalize any date representation (ISO, Date.toString(), dd/mm/yyyy, Date object) to YYYY-MM-DD */
function toIsoDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  // Already ISO (YYYY-MM-DD, possibly with time suffix)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fallback: anything Date can parse (e.g. "Mon Aug 01 2016 00:00:00 GMT+0000")
  const t = new Date(s);
  if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10);
  return undefined;
}

function gDate(row: Record<string, string>, keys: string[]): string | undefined {
  return toIsoDate(g(row, keys));
}

function gNum(row: Record<string, string>, keys: string[]): number | undefined {
  const v = g(row, keys);
  if (!v) return undefined;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

/** Normalize a company name into a URL-safe slug */
function toSlug(name: string, id?: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
  return id !== undefined ? `${base}-${id}` : base;
}

/** Lowercase + collapse whitespace + strip non-alphanumeric for search */
function toNormalizedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a raw key-value record (from XML or xlsx row) to InsertCompany */
function mapRecord(
  row: Record<string, string>,
  countryCode: string
): { data: InsertCompany; errors: string[] } | { data: null; errors: string[] } {
  const mapped: any = {
    countryCode,
    registrationNumber: g(row, ["CIN", "cin", "Registration Number", "RegistrationNumber", "CORP_REG_NO", "ACN", "UEN", "CompanyNumber", "Company Number", "COMPANY_NUMBER", "acn", "uen"]),
    cin: g(row, ["CIN", "cin", "CORP_REG_NO"]),
    name: g(row, ["Name", "name", "Company Name", "company_name", "CORP_NAME", "CompanyName", "COMPANY_NAME"]),
    source: g(row, ["source", "SOURCE"]) || (countryCode === "IN" ? "MCA" : "IMPORT"),
    status: g(row, ["Status", "status", "CORP_STATUS", "CompanyStatus", "COMPANY_STATUS"]),
    class: g(row, ["Class", "class", "Company Class", "CompanyClass", "CORP_CLASS"]),
    category: g(row, ["Category", "category", "CORP_CATEGORY"]),
    subCategory: g(row, ["Sub Category", "sub_category", "SubCategory", "SUB_CATEGORY"]),
    state: g(row, ["State", "state", "CORP_STATE", "STATE"]),
    district: g(row, ["District", "district", "DISTRICT"]),
    city: g(row, ["City", "city", "CORP_CITY", "CITY"]),
    pincode: g(row, ["Pincode", "pincode", "Pin Code", "PIN_CODE", "PINCODE"]),
    email: g(row, ["Email", "email", "EMAIL"]),
    phone: g(row, ["Phone", "phone", "Mobile", "MOBILE", "PHONE"]),
    address: g(row, ["Address", "address", "Registered Address", "REG_ADDRESS", "ADDRESS"]),
    roc: g(row, ["ROC", "roc", "Registrar of Companies", "ROC_CODE"]),
    country: g(row, ["Country", "country", "COUNTRY"]) ||
      ({ IN: "India", AU: "Australia", GB: "United Kingdom", SG: "Singapore", US: "United States" } as Record<string, string>)[countryCode] || undefined,
    incorporationDate: gDate(row, ["Incorporation Date", "incorporation_date", "Date of Incorporation", "DATE_OF_INC"]),
    lastAgmDate: gDate(row, ["Last AGM Date", "last_agm_date", "LAST_AGM_DATE"]),
    lastBalanceSheetDate: gDate(row, ["Last Balance Sheet Date", "last_balance_sheet_date", "LAST_BS_DATE"]),
    authorizedCapital: gNum(row, ["Authorized Capital", "authorized_capital", "AUTH_CAP", "AUTHORISED_CAP"]),
    paidUpCapital: gNum(row, ["Paid Up Capital", "paid_up_capital", "PAIDUP_CAP"]),
    industry: g(row, ["Industry", "industry", "INDUSTRY", "SIC", "SSIC"]),
    customQna: g(row, ["Custom QnA", "custom_qna"]),
  };

  // ── USA-specific fields ──────────────────────────────────────────────────
  if (countryCode === "US") {
    mapped.name = mapped.name || g(row, ["Business Name", "BUSINESS NAME", "business_name"]);
    mapped.address = mapped.address || g(row, ["Mailing Address", "MAILING ADDRESS", "mailing_address"]);
    mapped.city = mapped.city || g(row, ["Mailing City", "MAILING CITY", "mailing_city"]);
    mapped.state = mapped.state || g(row, ["Mailing State", "MAILING STATE", "mailing_state"]);
    mapped.pincode = mapped.pincode || g(row, ["Mailing Zip", "MAILING ZIP", "mailing_zip", "Zip", "ZIP"]);
    mapped.phone = mapped.phone || g(row, ["Area Code & Ph No", "AREA CODE & PH NO", "Area Code and Phone", "Phone Number", "PHONE NUMBER"]);
    mapped.publicPrivate = g(row, ["Public Private Co", "PUBLIC PRIVATE CO", "Public/Private", "Public Private", "PUBLIC PRIVATE", "public_private"]);
    mapped.locationType = g(row, ["Location Type", "LOCATION TYPE", "location_type"]);
    mapped.firmIndividual = g(row, ["Firm Individual", "FIRM INDIVIDUAL", "Firm/Individual", "firm_individual"]);
    mapped.webAddress = g(row, ["Web Address", "WEB ADDRESS", "web_address", "Website", "WEBSITE"]);
  }

  // ── Australia-specific fields ────────────────────────────────────────────
  if (countryCode === "AU") {
    mapped.companyType = g(row, ["Type", "TYPE", "Company Type", "COMPANY TYPE", "company_type"]);
    mapped.subCategory = mapped.subCategory || g(row, ["Sub Class", "SUB CLASS", "sub_class", "SubClass"]);
    mapped.incorporationDate = mapped.incorporationDate || gDate(row, ["Date of Registration", "DATE OF REGISTRATION", "date_of_registration"]);
    mapped.deregistrationDate = gDate(row, ["Date of Deregistration", "DATE OF DEREGISTRATION", "date_of_deregistration"]);
    mapped.previousStateOfRegistration = g(row, ["Previous State of Registration", "PREVIOUS STATE OF REGISTRATION", "previous_state_of_registration"]);
    mapped.stateRegistrationNumber = g(row, ["State Registration Number", "STATE REGISTRATION NUMBER", "state_registration_number"]);
    mapped.abn = g(row, ["ABN", "abn", "Australian Business Number", "AUSTRALIAN BUSINESS NUMBER"]);
    mapped.currentName = g(row, ["Current Name", "CURRENT NAME", "current_name"]);
  }

  // ── UK-specific fields (Companies House) ─────────────────────────────────
  if (countryCode === "GB") {
    mapped.category = mapped.category || g(row, ["Company Category", "COMPANY CATEGORY", "CompanyCategory"]);
    mapped.status = mapped.status || g(row, ["Company Status", "COMPANY STATUS"]);
    mapped.careOf = g(row, ["RegAddress.CareOf", "Care Of", "CARE OF", "care_of", "CareOf"]);
    mapped.poBox = g(row, ["RegAddress.POBox", "PO Box", "PO BOX", "po_box", "POBox"]);
    mapped.address = mapped.address || g(row, ["RegAddress.AddressLine1", "Address Line 1", "AddressLine1"]);
    mapped.addressLine2 = g(row, ["Address Line 2", "ADDRESS LINE 2", "RegAddress.AddressLine2", "AddressLine2", "address_line_2"]);
    mapped.city = mapped.city || g(row, ["RegAddress.PostTown", "Post Town", "PostTown"]);
    mapped.subCity = g(row, ["Sub City", "SUB CITY", "sub_city", "RegAddress.County", "County"]);
    mapped.pincode = mapped.pincode || g(row, ["Post Code", "POST CODE", "RegAddress.PostCode", "PostCode", "post_code"]);
    mapped.countryOfOrigin = g(row, ["Country Of Origin", "COUNTRY OF ORIGIN", "CountryOfOrigin", "country_of_origin"]);
    mapped.accountCategory = g(row, ["Accounts.AccountCategory", "Account Category", "ACCOUNT CATEGORY", "AccountCategory", "account_category"]);
    mapped.sicCode1 = g(row, ["SICCode.SicText_1", "SICCode Sic Text1", "SICCode.SicText1", "SIC Code 1", "sic_code_1"]);
    mapped.sicCode2 = g(row, ["SICCode.SicText_2", "SICCode.SicText2", "SIC Code 2", "sic_code_2"]);
    mapped.sicCode3 = g(row, ["SICCode.SicText_3", "SICCode.SicText3", "SIC Code 3", "sic_code_3"]);
    mapped.sicCode4 = g(row, ["SICCode.SicText_4", "SICCode.SicText4", "SIC Code 4", "sic_code_4"]);
    mapped.uri = g(row, ["URI", "uri", "Uri"]);
  }

  // ── Singapore-specific fields (ACRA) ─────────────────────────────────────
  if (countryCode === "SG") {
    mapped.name = mapped.name || g(row, ["Entity Name", "ENTITY NAME", "entity_name"]);
    mapped.status = mapped.status || g(row, ["Entity Status Description", "entity_status_description", "Entity Status", "ENTITY STATUS"]);
    mapped.incorporationDate = mapped.incorporationDate || gDate(row, ["Registration Incorporation Date", "registration_incorporation_date", "Registration Date", "REGISTRATION DATE"]);
    mapped.issuanceAgencyId = g(row, ["Issuance Agency ID", "ISSUANCE AGENCY ID", "issuance_agency_id"]);
    mapped.entityType = g(row, ["Entity Type Description", "entity_type_description", "Entity Type", "ENTITY TYPE"]);
    mapped.businessConstitution = g(row, ["Business Constitution Description", "business_constitution_description", "Business Constitution", "BUSINESS CONSTITUTION"]);
    mapped.companyType = g(row, ["Company Type Description", "company_type_description", "Company Type", "COMPANY TYPE"]);
    mapped.pafConstitution = g(row, ["PAF Constitution Description", "paf_constitution_description", "PAF Constitution", "PAF CONSTITUTION"]);
    mapped.block = g(row, ["Block", "BLOCK", "block"]);
    mapped.streetName = g(row, ["Street Name", "STREET NAME", "street_name"]);
    mapped.levelNo = g(row, ["Level No", "LEVEL NO", "level_no"]);
    mapped.unitNo = g(row, ["Unit No", "UNIT NO", "unit_no"]);
    mapped.buildingName = g(row, ["Building Name", "BUILDING NAME", "building_name"]);
    mapped.pincode = mapped.pincode || g(row, ["Postal Code", "POSTAL CODE", "postal_code"]);
    mapped.primarySsicCode = g(row, ["Primary SSIC Code", "PRIMARY SSIC CODE", "primary_ssic_code"]);
    mapped.primarySsicDescription = g(row, ["Primary SSIC Description", "PRIMARY SSIC DESCRIPTION", "primary_ssic_description"]);
    mapped.secondarySsicCode = g(row, ["Secondary SSIC Code", "SECONDARY SSIC CODE", "secondary_ssic_code"]);
    mapped.secondarySsicDescription = g(row, ["Secondary SSIC Description", "SECONDARY SSIC DESCRIPTION", "secondary_ssic_description"]);
  }

  if (!mapped.name) return { data: null, errors: ["Missing company name"] };

  // Generate normalized_name and a provisional slug (will get proper unique slug on insert)
  mapped.normalizedName = toNormalizedName(mapped.name);
  // Slug uniqueness is handled by the DB unique partial index; we set a base here
  // and the storage layer appends registration_number when there is a conflict
  mapped.slug = toSlug(mapped.name);
  if (mapped.registrationNumber) {
    // Make slug collision-safe by including registration number
    mapped.slug = `${mapped.slug}-${mapped.registrationNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`.substring(0, 110);
  }

  const parsed = insertCompanySchema.safeParse(mapped);
  if (!parsed.success) {
    return { data: null, errors: parsed.error.errors.map(e => e.message) };
  }
  return { data: parsed.data, errors: [] };
}

// ── Batch flush ────────────────────────────────────────────────────────────────

async function flushBatch(
  jobId: number,
  batch: InsertCompany[],
  counters: { processed: number; inserted: number; skipped: number; errors: number }
) {
  if (batch.length === 0) return;
  await storage.bulkCreateCompanies(batch);
  counters.inserted += batch.length;
  await storage.updateImportJob(jobId, {
    processedRecords: counters.processed,
    insertedRecords: counters.inserted,
    skippedRecords: counters.skipped,
    errorRecords: counters.errors,
  });
}

// ── XML streaming ─────────────────────────────────────────────────────────────

function streamXmlFile(
  filePath: string,
  jobId: number,
  countryCode: string,
  counters: { processed: number; inserted: number; skipped: number; errors: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
    const parser = (sax as any).createStream(true, { lowercase: false, trim: true });

    let recordElement: string | null = null;
    let depth = 0;
    let currentRecord: Record<string, string> | null = null;
    let currentField: string | null = null;
    let currentText = "";
    const batch: InsertCompany[] = [];
    let flushChain: Promise<void> = Promise.resolve();

    parser.on("opentag", (node: { name: string; attributes: Record<string, string> }) => {
      depth++;
      if (depth === 2) {
        // Second level: this is the record element
        if (!recordElement) recordElement = node.name;
        if (node.name === recordElement) {
          // Start a new record; attrs may carry field values directly
          currentRecord = { ...node.attributes };
          currentField = null;
          currentText = "";
        }
      } else if (depth === 3 && currentRecord !== null) {
        // Third level: field element inside a record
        currentField = node.name;
        currentText = "";
        // Also capture inline attributes as field values
        if (node.attributes) {
          for (const [k, v] of Object.entries(node.attributes)) {
            currentRecord[k] = v;
          }
        }
      }
    });

    parser.on("text", (text: string) => {
      if (depth === 3 && currentField !== null) currentText += text;
      // Some XML puts data directly on depth-2 text nodes (flat format)
      if (depth === 2 && currentRecord !== null) currentText += text;
    });

    parser.on("cdata", (cdata: string) => {
      if (depth === 3 && currentField !== null) currentText += cdata;
    });

    parser.on("closetag", (name: string) => {
      if (depth === 3 && currentRecord !== null && currentField !== null) {
        if (currentText) currentRecord[currentField] = currentText;
        currentField = null;
        currentText = "";
      }

      if (depth === 2 && name === recordElement && currentRecord !== null) {
        // Record complete — map and validate
        counters.processed++;
        const result = mapRecord(currentRecord, countryCode);
        if (result.data) {
          batch.push(result.data);
        } else {
          counters.skipped++;
          // Log first 1000 errors only to avoid polluting import_errors table
          if (counters.skipped <= 1000) {
            storage.createImportError({
              importJobId: jobId,
              recordNumber: counters.processed,
              errorType: "VALIDATION",
              errorMessage: result.errors.join("; "),
              identifier: currentRecord["CIN"] || currentRecord["cin"] || undefined,
            }).catch(() => {});
          }
        }
        currentRecord = null;

        // Flush batch when full — pause file stream, await DB write, then resume
        if (batch.length >= BATCH_SIZE) {
          const toFlush = batch.splice(0, BATCH_SIZE);
          fileStream.pause();
          const snap = { ...counters };
          flushChain = flushChain
            .then(() => flushBatch(jobId, toFlush, counters))
            .then(() => { fileStream.resume(); })
            .catch((err) => { fileStream.destroy(err); });
        }
      }

      depth--;
    });

    parser.on("error", (err: Error) => {
      // Non-fatal parse errors: log and continue
      console.warn(`[import:${jobId}] XML parse warning at record ${counters.processed}:`, err.message);
      parser._parser.error = null;
      parser._parser.resume();
    });

    fileStream.on("end", () => {
      // After file finishes, flush any remaining records
      flushChain = flushChain
        .then(async () => {
          if (batch.length > 0) await flushBatch(jobId, batch.splice(0), counters);
        })
        .then(resolve)
        .catch(reject);
    });

    fileStream.on("error", reject);
    fileStream.pipe(parser);
  });
}

// ── XLSX / CSV processing (background, not streaming — kept for smaller files) ─

async function processXlsxFile(
  filePath: string,
  jobId: number,
  countryCode: string,
  counters: { processed: number; inserted: number; skipped: number; errors: number }
): Promise<void> {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  await storage.updateImportJob(jobId, { totalRecords: rows.length });

  const batch: InsertCompany[] = [];

  for (const row of rows) {
    counters.processed++;
    // Flatten xlsx objects (same as before)
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      flat[k] = typeof v === "object" && v !== null
        ? (v as any)._ || (v as any)["#text"] || String(v)
        : String(v ?? "");
    }
    const result = mapRecord(flat, countryCode);
    if (result.data) {
      batch.push(result.data);
    } else {
      counters.skipped++;
      if (counters.skipped <= 1000) {
        storage.createImportError({
          importJobId: jobId,
          recordNumber: counters.processed,
          errorType: "VALIDATION",
          errorMessage: result.errors.join("; "),
          identifier: flat["CIN"] || flat["cin"] || undefined,
        }).catch(() => {});
      }
    }

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(jobId, batch.splice(0, BATCH_SIZE), counters);
    }
  }
  if (batch.length > 0) await flushBatch(jobId, batch.splice(0), counters);
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function processImportJob(
  jobId: number,
  filePath: string,
  originalName: string,
  countryCode = "IN"
): Promise<void> {
  const isXml = originalName.toLowerCase().endsWith(".xml");
  const counters = { processed: 0, inserted: 0, skipped: 0, errors: 0 };

  await storage.updateImportJob(jobId, { status: "PROCESSING", startedAt: new Date() });
  console.log(`[import:${jobId}] Starting ${isXml ? "XML stream" : "XLSX"} import — ${originalName}`);

  try {
    if (isXml) {
      await streamXmlFile(filePath, jobId, countryCode, counters);
    } else {
      await processXlsxFile(filePath, jobId, countryCode, counters);
    }

    await storage.updateImportJob(jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      processedRecords: counters.processed,
      insertedRecords: counters.inserted,
      skippedRecords: counters.skipped,
      errorRecords: counters.errors,
    });
    console.log(`[import:${jobId}] Completed — processed:${counters.processed} inserted:${counters.inserted} skipped:${counters.skipped}`);
  } catch (err: any) {
    console.error(`[import:${jobId}] FAILED:`, err.message);
    await storage.updateImportJob(jobId, {
      status: "FAILED",
      completedAt: new Date(),
      processedRecords: counters.processed,
      insertedRecords: counters.inserted,
      skippedRecords: counters.skipped,
      errorRecords: counters.errors,
      errorMessage: err.message?.substring(0, 500),
    });
  } finally {
    fs.unlink(filePath, () => {});
  }
}
