/**
 * Bulk CSV/XLSX import parsing for the LLP and IFSC datasets.
 * Flexible header mapping: headers are normalized (lowercased, non-alphanumerics
 * stripped) so "LLP Name", "llp_name" and "LLPName" all match.
 */
// CJS/ESM mismatch: xlsx must be default-imported or readFile is undefined
import xlsxLib from "xlsx";
const xlsx = xlsxLib as any;
import type { InsertLlp, InsertIfsc } from "@shared/schema";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — dataset imports, not media
const MAX_IMPORT_ROWS = 200_000;

function readRows(filePath: string): Record<string, any>[] {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (rows.length > MAX_IMPORT_ROWS)
    throw new Error(`File has ${rows.length} rows — maximum per import is ${MAX_IMPORT_ROWS}. Split the file and retry.`);
  return rows;
}

/** Find the first matching normalized header for a list of aliases. */
function pick(row: Record<string, any>, aliases: string[]): any {
  for (const key of Object.keys(row)) {
    if (aliases.includes(norm(key))) {
      const v = row[key];
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
  }
  return null;
}

const str = (v: any) => (v === null ? null : String(v).trim() || null);

/** True if y-m-d is a real calendar date. */
function isRealDate(y: number, mo: number, d: number): boolean {
  if (y < 1800 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Normalize dates from Excel Date objects, ISO, dd/mm/yyyy or dd-mm-yyyy to YYYY-MM-DD.
 * Returns undefined for invalid (non-empty but unparseable/impossible) values so callers
 * can report them; returns null for empty values.
 */
function toIsoDate(v: any): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (m) {
    const [, y, mo, d] = m.map(Number) as any;
    return isRealDate(y, mo, d) ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
  }
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (isRealDate(y, mo, d))
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return undefined;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

export interface ParseResult<T> {
  rows: T[];
  errors: string[];   // sample of row-level problems (capped)
  totalRows: number;
}

const LLP_ALIASES = {
  llpin: ["llpin", "llpid", "llpidentificationnumber", "llpinno"],
  name: ["name", "llpname", "companyname", "entityname"],
  registrationDate: ["registrationdate", "dateofincorporation", "incorporationdate", "dateofregistration", "regdate", "doi"],
  roc: ["roc", "rocname", "registrarofcompanies", "roccode"],
  state: ["state", "statename"],
  district: ["district", "districtname"],
  status: ["status", "llpstatus", "companystatus"],
  industry: ["industry", "industrialclassification", "activitydescription", "description", "mainactivity", "businessactivity"],
  address: ["address", "registeredaddress", "registeredofficeaddress", "regaddress"],
  email: ["email", "emailid", "emailaddress"],
  totalObligation: ["totalobligation", "totalobligationofcontribution", "obligationofcontribution", "contribution", "capitalcontribution"],
};

export function parseLlpFile(filePath: string): ParseResult<InsertLlp> {
  const raw = readRows(filePath);
  const rows: InsertLlp[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  raw.forEach((r, i) => {
    const name = str(pick(r, LLP_ALIASES.name));
    if (!name) {
      if (errors.length < 20) errors.push(`Row ${i + 2}: missing LLP name — skipped`);
      return;
    }
    const llpin = str(pick(r, LLP_ALIASES.llpin))?.toUpperCase() ?? null;
    // Dedup within the file: by LLPIN when present, otherwise by normalized name
    // (no-LLPIN rows have no other stable identity and would duplicate on insert).
    const dedupKey = llpin ?? `name:${norm(name)}`;
    if (seen.has(dedupKey)) {
      if (errors.length < 20) errors.push(`Row ${i + 2}: duplicate ${llpin ? `LLPIN ${llpin}` : `LLP name "${name}" (no LLPIN)`} in file — skipped`);
      return;
    }
    seen.add(dedupKey);
    const obligationRaw = pick(r, LLP_ALIASES.totalObligation);
    const obligation = obligationRaw === null ? null : Number(String(obligationRaw).replace(/[,\s₹]/g, ""));
    const regDate = toIsoDate(pick(r, LLP_ALIASES.registrationDate));
    if (regDate === undefined && errors.length < 20)
      errors.push(`Row ${i + 2}: invalid registration date "${pick(r, LLP_ALIASES.registrationDate)}" — imported without date`);
    rows.push({
      llpin,
      name,
      registrationDate: regDate ?? null,
      roc: str(pick(r, LLP_ALIASES.roc)),
      state: str(pick(r, LLP_ALIASES.state)),
      district: str(pick(r, LLP_ALIASES.district)),
      status: str(pick(r, LLP_ALIASES.status)),
      industry: str(pick(r, LLP_ALIASES.industry)),
      address: str(pick(r, LLP_ALIASES.address)),
      email: str(pick(r, LLP_ALIASES.email)),
      totalObligation: Number.isFinite(obligation as number) ? (obligation as number) : null,
    });
  });
  return { rows, errors, totalRows: raw.length };
}

const IFSC_ALIASES = {
  bank: ["bank", "bankname"],
  ifsc: ["ifsc", "ifsccode", "ifscode"],
  branch: ["branch", "branchname"],
  district: ["district", "districtname"],
  state: ["state", "statename"],
  address: ["address", "branchaddress"],
  city: ["city", "cityname", "centre", "center"],
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function parseIfscFile(filePath: string): ParseResult<InsertIfsc> {
  const raw = readRows(filePath);
  const rows: InsertIfsc[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  raw.forEach((r, i) => {
    const bank = str(pick(r, IFSC_ALIASES.bank));
    const ifsc = str(pick(r, IFSC_ALIASES.ifsc))?.toUpperCase() ?? null;
    if (!bank || !ifsc) {
      if (errors.length < 20) errors.push(`Row ${i + 2}: missing ${!bank ? "bank" : "IFSC"} — skipped`);
      return;
    }
    if (!IFSC_RE.test(ifsc)) {
      if (errors.length < 20) errors.push(`Row ${i + 2}: invalid IFSC "${ifsc}" — skipped`);
      return;
    }
    if (seen.has(ifsc)) {
      if (errors.length < 20) errors.push(`Row ${i + 2}: duplicate IFSC ${ifsc} in file — skipped`);
      return;
    }
    seen.add(ifsc);
    rows.push({
      bank,
      ifsc,
      branch: str(pick(r, IFSC_ALIASES.branch)),
      district: str(pick(r, IFSC_ALIASES.district)),
      state: str(pick(r, IFSC_ALIASES.state)),
      address: str(pick(r, IFSC_ALIASES.address)),
      city: str(pick(r, IFSC_ALIASES.city)),
    });
  });
  return { rows, errors, totalRows: raw.length };
}
