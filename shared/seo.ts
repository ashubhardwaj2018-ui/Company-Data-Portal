/**
 * Central SEO decision service for AddressBay.
 *
 * Every dynamically generated page gets one SEO decision from here:
 *   - "index, follow"   → eligible for Google indexing + XML sitemap
 *   - "noindex, follow" → crawlable, links followed, but kept out of search results & sitemaps
 *
 * Used by BOTH the client (robots meta tag via Helmet) and the server
 * (sitemap eligibility), so the decision can never diverge.
 *
 * IMPORTANT: server/storage.ts mirrors these rules as SQL predicates for
 * memory-efficient sitemap generation (see sitemapEligible* comments there).
 * If you change a rule here, update the matching SQL predicate too.
 */

export interface SeoStatus {
  robots: "index, follow" | "noindex, follow";
  indexable: boolean;
  includeInSitemap: boolean;
  canonicalUrl: string;
  reason: string;
}

/** Configurable quality thresholds — adjust here, not inline. */
export const SEO_RULES = {
  /** Minimum "meaningful detail" fields a company needs beyond name+identifier. */
  companyMinDetailFields: 1,
  /** Minimum detail fields an LLP needs beyond its name. */
  llpMinDetailFields: 1,
};

const filled = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== "";

function indexable(canonicalUrl: string, reason: string): SeoStatus {
  return { robots: "index, follow", indexable: true, includeInSitemap: true, canonicalUrl, reason };
}
function noindex(canonicalUrl: string, reason: string, includeInSitemap = false): SeoStatus {
  return { robots: "noindex, follow", indexable: false, includeInSitemap, canonicalUrl, reason };
}

// ── Company profile pages ─────────────────────────────────────────────────────
export interface CompanySeoInput {
  id: number;
  name?: string | null;
  slug?: string | null;
  countryCode?: string | null;
  cin?: string | null;
  registrationNumber?: string | null;
  status?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  incorporationDate?: string | null;
}

export function getCompanySeoStatus(c: CompanySeoInput, origin = ""): SeoStatus {
  const canonical = c.slug && c.countryCode
    ? `${origin}/${c.countryCode.toLowerCase()}/company/${c.slug}`
    : `${origin}/company/${c.id}`;

  if (!filled(c.name)) return noindex(canonical, "invalid_record");
  const hasIdentifier = filled(c.cin) || filled(c.registrationNumber) || filled(c.slug);
  if (!hasIdentifier) return noindex(canonical, "incomplete_record");

  const detailFields = [c.status, c.state, c.city, c.address, c.incorporationDate].filter(filled).length;
  if (detailFields < SEO_RULES.companyMinDetailFields) return noindex(canonical, "thin_content");

  return indexable(canonical, "complete_company_profile");
}

// ── LLP profile pages ─────────────────────────────────────────────────────────
export interface LlpSeoInput {
  id: number;
  name?: string | null;
  llpin?: string | null;
  state?: string | null;
  district?: string | null;
  status?: string | null;
  industry?: string | null;
  registrationDate?: string | null;
}

export function getLlpSeoStatus(l: LlpSeoInput, origin = ""): SeoStatus {
  const canonical = `${origin}/llps/${l.id}`;
  if (!filled(l.name)) return noindex(canonical, "invalid_record");
  const detailFields = [l.llpin, l.state, l.district, l.status, l.industry, l.registrationDate].filter(filled).length;
  if (detailFields < SEO_RULES.llpMinDetailFields) return noindex(canonical, "thin_content");
  return indexable(canonical, "quality_database_page");
}

// ── IFSC branch pages ─────────────────────────────────────────────────────────
export interface IfscSeoInput {
  ifsc: string;
  bank?: string | null;
}

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function getIfscSeoStatus(r: IfscSeoInput, origin = ""): SeoStatus {
  const canonical = `${origin}/ifsc/${r.ifsc}`;
  if (!IFSC_RE.test(r.ifsc || "") || !filled(r.bank)) return noindex(canonical, "invalid_record");
  return indexable(canonical, "quality_database_page");
}

// ── Listing / landing / utility pages ────────────────────────────────────────
/**
 * Decision for non-record pages. `pathname` should NOT include the query string;
 * pass `hasQueryParams` separately so search/filter/sort URLs get noindex while
 * the clean landing URL stays indexable with a self-canonical.
 */
export function getListingSeoStatus(opts: {
  pathname: string;
  origin?: string;
  hasQueryParams?: boolean;
  isUtilityPage?: boolean;
  isImportantLanding?: boolean;
}): SeoStatus {
  const origin = opts.origin || "";
  const canonical = `${origin}${opts.pathname}`;
  if (opts.isUtilityPage) return noindex(canonical, "not_public");
  if (opts.hasQueryParams) return noindex(canonical, "filter_page");
  return indexable(canonical, opts.isImportantLanding ? "important_landing_page" : "quality_database_page");
}
