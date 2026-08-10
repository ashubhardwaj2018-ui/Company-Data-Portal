import type { Company } from "@shared/schema";
import { format } from "date-fns";

// ── Country registration terminology mapping ─────────────────────────────────
interface CountryRegMeta {
  countryName: string;
  regLabel: string;          // registration number label
  authority: string | null;  // registration authority
  action: string;            // incorporated / registered
  addressTerm: string;       // registered office / principal business address
}

const REG_META: Record<string, CountryRegMeta> = {
  IN: { countryName: "India",          regLabel: "CIN",            authority: "the Registrar of Companies (MCA)",                     action: "incorporated", addressTerm: "registered office" },
  GB: { countryName: "United Kingdom", regLabel: "Company Number", authority: "Companies House",                                      action: "incorporated", addressTerm: "registered office" },
  AU: { countryName: "Australia",      regLabel: "ACN",            authority: "the Australian Securities and Investments Commission (ASIC)", action: "registered", addressTerm: "registered office" },
  SG: { countryName: "Singapore",      regLabel: "UEN",            authority: "the Accounting and Corporate Regulatory Authority (ACRA)", action: "incorporated", addressTerm: "registered office" },
  US: { countryName: "United States",  regLabel: "Entity Number",  authority: "the relevant state authority",                          action: "registered",   addressTerm: "principal business address" },
};

const DEFAULT_META: CountryRegMeta = {
  countryName: "", regLabel: "Registration Number", authority: null, action: "registered", addressTerm: "registered address",
};

const isBlank = (v: unknown): boolean => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || /^(n\/a|na|null|undefined|unknown|-)$/i.test(s);
};
const clean = (v: unknown): string | null => (isBlank(v) ? null : String(v).trim());

/**
 * Builds a natural-language introduction paragraph from company data.
 * Omits missing fields gracefully; never emits undefined/null/N-A.
 * Returns null if there is not enough data to say anything meaningful.
 */
export function buildCompanyIntro(company: Company): string | null {
  const cc = (company.countryCode || "IN").toUpperCase();
  const meta = REG_META[cc] ?? DEFAULT_META;

  const name = clean(company.name);
  if (!name) return null;

  const entityType = clean(company.class) || clean(company.category);
  const city = clean(company.city);
  const region = clean(company.state);
  const country = clean(company.country) || meta.countryName || null;
  const regNumber = clean(company.cin) || clean(company.registrationNumber);
  const authority = cc === "IN" && clean(company.roc) ? `the Registrar of Companies (${clean(company.roc)})` : meta.authority;
  const status = clean(company.status);
  const address = clean(company.address);

  let regDate: string | null = null;
  if (!isBlank(company.incorporationDate)) {
    const d = new Date(String(company.incorporationDate));
    if (!isNaN(d.getTime())) regDate = format(d, "d MMMM yyyy");
  }

  const sentences: string[] = [];

  // Sentence 1: identity + location
  const place = [city, region, country].filter(Boolean).join(", ");
  let s1 = name;
  s1 += entityType ? ` is a ${entityType.toLowerCase().includes("company") || entityType.toLowerCase().includes("liability") ? entityType : `${entityType} company`}` : " is a company";
  if (place) s1 += ` registered in ${place}`;
  sentences.push(s1 + ".");

  // Sentence 2: registration date / authority / number
  const parts: string[] = [];
  if (regDate) parts.push(`was ${meta.action} on ${regDate}`);
  if (regNumber) {
    if (authority) parts.push(`is registered with ${authority} under ${meta.regLabel} ${regNumber}`);
    else parts.push(`is registered under ${meta.regLabel} ${regNumber}`);
  } else if (authority && regDate) {
    // date already present; append authority only when it adds information
    parts[0] = `was ${meta.action} on ${regDate} and is registered with ${authority}`;
  }
  if (parts.length) sentences.push(`The company ${parts.join(" and ")}.`);

  // Sentence 3: status + address
  const tail: string[] = [];
  if (status) tail.push(`Its current registration status is ${status}`);
  if (address) {
    const addrClause = `its ${meta.addressTerm} is located at ${address}`;
    tail.push(tail.length ? addrClause : `Its ${meta.addressTerm} is located at ${address}`.replace(/^its/, "Its"));
  }
  if (tail.length) sentences.push(tail.join(" and ") + ".");

  return sentences.join(" ");
}
