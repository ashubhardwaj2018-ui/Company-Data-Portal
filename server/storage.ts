import { db } from "./db";
import {
  companies, type InsertCompany, type Company,
  admins,
  posts, type Post, type InsertPost,
  articles, type Article, type InsertArticle,
  faqs, type Faq, type InsertFaq,
  services, type Service, type InsertService,
  siteSettings, type SiteSetting,
  importJobs, type ImportJob, type InsertImportJob,
  importErrors,
  companyClaims, type CompanyClaim, type InsertClaim,
  userWatchlist, type UserWatchlistItem,
  companySuggestions, type CompanySuggestion, type InsertSuggestion,
  companyReviews, type CompanyReview, type InsertReview,
  newsletterSubscribers, type NewsletterSubscriber,
  savedSearches, type SavedSearch,
  aiTopics, type AiTopic, type InsertAiTopic,
  llps, type Llp, type InsertLlp,
  ifscCodes, type IfscCode, type InsertIfsc,
} from "@shared/schema";
import { users, type User as AuthUser } from "@shared/models/auth";
import { eq, ilike, desc, count, sql, asc, gte, lte, and, inArray, isNull } from "drizzle-orm";
import { cache, TTL } from "./cache";

export interface IStorage {
  // Companies
  getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string, countryCode?: string, state?: string, status?: string, city?: string): Promise<{ data: Company[]; total: number }>;
  searchSuggestions(q: string, countryCode?: string, limit?: number): Promise<{ id: number; name: string; cin: string | null; slug: string | null; countryCode: string | null; state: string | null; city: string | null; status: string | null }[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySlug(countryCode: string, slug: string): Promise<Company | undefined>;
  getRelatedCompanies(excludeId: number, countryCode: string, state?: string | null, roc?: string | null, limit?: number): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;
  bulkCreateCompanies(companiesData: InsertCompany[]): Promise<void>;

  // Posts (blog)
  getPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;

  // Articles
  getArticles(): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, article: Partial<InsertArticle>): Promise<Article | undefined>;
  deleteArticle(id: number): Promise<void>;

  // FAQs
  getFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;

  // Services
  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Site Settings
  getAiTopics(): Promise<AiTopic[]>;
  createAiTopic(topic: InsertAiTopic): Promise<AiTopic>;
  deleteAiTopic(id: number): Promise<void>;
  updateAiTopic(id: number, updates: Partial<AiTopic>): Promise<AiTopic | undefined>;
  claimNextPendingAiTopic(): Promise<AiTopic | undefined>;
  recoverStaleAiTopics(maxAgeMs: number): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  getSettings(keys: string[]): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<void>;

  // Admin
  isAdmin(email: string): Promise<boolean>;
  addAdmin(email: string): Promise<void>;

  // Directory stats
  getDirectoryStats(countryCode?: string): Promise<{
    total: number;
    byState: { state: string | null; count: number }[];
    byCountry: { countryCode: string | null; count: number }[];
  }>;

  // Import Jobs
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  updateImportJob(id: number, data: Partial<InsertImportJob>): Promise<void>;
  getImportJob(id: number): Promise<ImportJob | undefined>;
  listImportJobs(limit?: number): Promise<ImportJob[]>;
  createImportError(err: { importJobId: number; recordNumber?: number; errorType?: string; errorMessage?: string; identifier?: string }): Promise<void>;
  markStaleJobsFailed(): Promise<void>;

  // Phase 7 — Company Claims
  createClaim(claim: Omit<InsertClaim, "status" | "reviewedBy">): Promise<CompanyClaim>;
  listClaims(status?: string): Promise<(CompanyClaim & { companyName: string | null })[]>;
  updateClaimStatus(id: number, status: "approved" | "rejected", reviewedBy: string): Promise<void>;

  // Phase 8 — View tracking
  incrementViewCount(companyId: number): Promise<void>;
  getTrendingCompanies(limit?: number, countryCode?: string): Promise<Company[]>;

  // Phase 11 — Watchlist
  addToWatchlist(userEmail: string, companyId: number): Promise<UserWatchlistItem>;
  removeFromWatchlist(userEmail: string, companyId: number): Promise<void>;
  getUserWatchlist(userEmail: string, page?: number, limit?: number): Promise<{ data: Company[]; total: number }>;
  isInWatchlist(userEmail: string, companyId: number): Promise<boolean>;

  // Phase 14 — Data correction suggestions
  createSuggestion(suggestion: Omit<InsertSuggestion, "status" | "reviewedBy">): Promise<CompanySuggestion>;
  listSuggestions(status?: string): Promise<(CompanySuggestion & { companyName: string | null })[]>;
  updateSuggestionStatus(id: number, status: "applied" | "dismissed", reviewedBy: string): Promise<{ applied: boolean; fieldName?: string }>;
  listUserSuggestions(userEmail: string): Promise<(CompanySuggestion & { companyName: string | null })[]>;

  // Phase 15 — Company comparison
  getCompaniesByIds(ids: number[]): Promise<Company[]>;

  // Phase 16 — Newsletter
  subscribeNewsletter(email: string, name?: string, source?: string): Promise<{ isNew: boolean }>;
  listSubscribers(): Promise<NewsletterSubscriber[]>;
  unsubscribeNewsletter(email: string): Promise<void>;

  // Phase 17 — User profile (per-user claims)
  listUserClaims(userEmail: string): Promise<(CompanyClaim & { companyName: string | null })[]>;

  // Phase 18 / 22 — Industry & Pincode browse use existing getCompanies

  // Phase 19 — Reviews
  createReview(review: Omit<InsertReview, "status" | "reviewedBy">): Promise<CompanyReview>;
  getCompanyReviews(companyId: number): Promise<{ reviews: CompanyReview[]; avg: number; total: number }>;
  listReviews(status?: string): Promise<(CompanyReview & { companyName: string | null })[]>;
  updateReviewStatus(id: number, status: "approved" | "rejected", reviewedBy: string): Promise<void>;

  // Phase 21 — Recent activity
  getRecentlyUpdated(limit?: number, countryCode?: string): Promise<Company[]>;

  // Phase 24 — Bulk company update
  bulkUpdateCompanies(ids: number[], fields: Partial<InsertCompany>): Promise<number>;
  applyFieldToCompany(companyId: number, fieldName: string, value: string): Promise<boolean>;

  // Phase 26 — Company badges
  updateCompanyBadges(id: number, badges: string[]): Promise<void>;

  // Phase 27 — Saved searches
  getSavedSearches(userEmail: string): Promise<SavedSearch[]>;
  createSavedSearch(userEmail: string, name: string, filters: string): Promise<SavedSearch>;
  deleteSavedSearch(id: number, userEmail: string): Promise<void>;

  // Phase 29 — User management
  listAllUsers(limit?: number): Promise<AuthUser[]>;

  // ── Indian LLPs ─────────────────────────────────────────────────────────
  getLlps(page: number, limit: number, search?: string, state?: string, status?: string): Promise<{ data: Llp[]; total: number }>;
  getLlp(id: number): Promise<Llp | undefined>;
  createLlp(llp: InsertLlp): Promise<Llp>;
  updateLlp(id: number, llp: Partial<InsertLlp>): Promise<Llp | undefined>;
  deleteLlp(id: number): Promise<void>;
  bulkUpsertLlps(rows: InsertLlp[]): Promise<{ imported: number }>;
  getRelatedLlps(excludeId: number, state?: string | null, limit?: number): Promise<Llp[]>;

  // ── Bank IFSC codes ─────────────────────────────────────────────────────
  getIfscCodes(page: number, limit: number, search?: string, bank?: string, state?: string): Promise<{ data: IfscCode[]; total: number }>;
  getIfscByCode(ifsc: string): Promise<IfscCode | undefined>;
  createIfsc(row: InsertIfsc): Promise<IfscCode>;
  updateIfsc(id: number, row: Partial<InsertIfsc>): Promise<IfscCode | undefined>;
  deleteIfsc(id: number): Promise<void>;
  bulkUpsertIfsc(rows: InsertIfsc[]): Promise<{ imported: number }>;
}

export class DatabaseStorage implements IStorage {
  // ── Companies ──────────────────────────────────────────────────────────────
  async getCompanies(
    page: number, limit: number,
    search?: string, alphabet?: string, country?: string, countryCode?: string,
    state?: string, status?: string, city?: string,
    industry?: string, pincode?: string,
    minCapital?: number, maxCapital?: number,
    incorporatedAfter?: string, incorporatedBefore?: string,
    sortBy?: string,
  ) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (search) conditions.push(sql`(${companies.name} ILIKE ${`%${search}%`} OR ${companies.cin} ILIKE ${`%${search}%`} OR ${companies.email} ILIKE ${`%${search}%`})`);
    if (alphabet) {
      if (/^[0-9]$/.test(alphabet)) conditions.push(sql`${companies.name} ~ '^[0-9]'`);
      else conditions.push(ilike(companies.name, `${alphabet}%`));
    }
    if (countryCode) conditions.push(eq(companies.countryCode, countryCode.toUpperCase()));
    else if (country) conditions.push(ilike(companies.country, country));
    if (state) conditions.push(ilike(companies.state, state));
    if (status) conditions.push(ilike(companies.status, status));
    if (city) conditions.push(ilike(companies.city, city));
    if (industry) conditions.push(ilike(companies.industry, `%${industry}%`));
    if (pincode) conditions.push(eq(companies.pincode, pincode));
    if (minCapital != null) conditions.push(sql`${companies.authorizedCapital} >= ${minCapital}`);
    if (maxCapital != null) conditions.push(sql`${companies.authorizedCapital} <= ${maxCapital}`);
    if (incorporatedAfter) conditions.push(sql`${companies.incorporationDate} >= ${incorporatedAfter}::date`);
    if (incorporatedBefore) conditions.push(sql`${companies.incorporationDate} <= ${incorporatedBefore}::date`);

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const orderCol = (() => {
      switch (sortBy) {
        case "name":         return asc(companies.name);
        case "capital":      return desc(companies.authorizedCapital);
        case "incorporated": return asc(companies.incorporationDate);
        case "views":        return desc(companies.viewCount);
        case "recent":       return desc(companies.updatedAt);
        default:             return desc(companies.id);
      }
    })();

    const [{ count: total }] = await db.select({ count: count() }).from(companies).where(whereClause);
    const data = await db.select().from(companies).where(whereClause).limit(limit).offset(offset).orderBy(orderCol);
    return { data, total };
  }

  async searchSuggestions(q: string, countryCode?: string, limit = 8): Promise<{ id: number; name: string; cin: string | null; slug: string | null; countryCode: string | null; state: string | null; city: string | null; status: string | null }[]> {
    const cacheKey = `suggest:${q.toLowerCase()}:${countryCode || ""}:${limit}`;
    const cached = cache.get<{ id: number; name: string; cin: string | null; slug: string | null; countryCode: string | null; state: string | null; city: string | null; status: string | null }[]>(cacheKey);
    if (cached) return cached;

    const conditions: any[] = [
      sql`(${companies.name} ILIKE ${`%${q}%`} OR ${companies.cin} ILIKE ${`%${q}%`})`,
    ];
    if (countryCode) conditions.push(eq(companies.countryCode, countryCode.toUpperCase()));
    const whereClause = conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0];
    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        cin: companies.cin,
        slug: companies.slug,
        countryCode: companies.countryCode,
        state: companies.state,
        city: companies.city,
        status: companies.status,
      })
      .from(companies)
      .where(whereClause)
      .orderBy(desc(companies.id))
      .limit(limit);
    cache.set(cacheKey, results, TTL.SUGGEST);
    return results;
  }

  async getCompany(id: number) {
    const [c] = await db.select().from(companies).where(eq(companies.id, id));
    return c;
  }

  async getCompanyBySlug(countryCode: string, slug: string) {
    const { and, eq: deq } = await import("drizzle-orm");
    const [c] = await db.select().from(companies)
      .where(and(
        deq(companies.countryCode, countryCode.toUpperCase()),
        deq(companies.slug, slug),
      ));
    return c;
  }

  async getDirectoryStats(countryCode?: string): Promise<{ total: number; byState: { state: string | null; count: number }[]; byCountry: { countryCode: string | null; count: number }[] }> {
    const cacheKey = `stats:${countryCode || "global"}`;
    const cached = cache.get<{ total: number; byState: { state: string | null; count: number }[]; byCountry: { countryCode: string | null; count: number }[] }>(cacheKey);
    if (cached) return cached;

    const whereClause = countryCode
      ? eq(companies.countryCode, countryCode.toUpperCase())
      : undefined;

    const [{ total }] = await db.select({ total: count() }).from(companies).where(whereClause);

    const byState = await db
      .select({ state: companies.state, count: count() })
      .from(companies)
      .where(whereClause)
      .groupBy(companies.state)
      .orderBy(desc(count()))
      .limit(30);

    let byCountry: { countryCode: string | null; count: number }[] = [];
    if (!countryCode) {
      byCountry = await db
        .select({ countryCode: companies.countryCode, count: count() })
        .from(companies)
        .groupBy(companies.countryCode)
        .orderBy(desc(count()));
    }

    const result = { total, byState, byCountry };
    cache.set(cacheKey, result, TTL.STATS);
    return result;
  }

  async getRelatedCompanies(excludeId: number, countryCode: string, state?: string | null, roc?: string | null, limit = 6): Promise<Company[]> {
    const { and, or, ne } = await import("drizzle-orm");
    // Match same state OR same roc, within the same country, excluding self
    const geoMatch = state
      ? ilike(companies.state, state)
      : roc
        ? ilike(companies.roc, roc)
        : undefined;

    const whereClause = geoMatch
      ? and(ne(companies.id, excludeId), eq(companies.countryCode, countryCode.toUpperCase()), geoMatch)
      : and(ne(companies.id, excludeId), eq(companies.countryCode, countryCode.toUpperCase()));

    const local = await db.select().from(companies).where(whereClause).orderBy(desc(companies.id)).limit(limit);
    if (local.length >= limit) return local;

    // Fill remaining slots with suggestions from anywhere (rest of country + other countries)
    const excludeIds = [excludeId, ...local.map(c => c.id)];
    const { notInArray } = await import("drizzle-orm");
    const global = await db.select().from(companies)
      .where(notInArray(companies.id, excludeIds))
      .orderBy(desc(companies.viewCount), desc(companies.id))
      .limit(limit - local.length);
    return [...local, ...global];
  }

  async createCompany(company: InsertCompany) {
    const [c] = await db.insert(companies).values(company).returning();
    return c;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>) {
    const [c] = await db.update(companies).set({ ...company, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
    return c;
  }

  async deleteCompany(id: number) {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async bulkCreateCompanies(companiesData: InsertCompany[]) {
    if (!companiesData.length) return;
    const chunkSize = 1000;
    for (let i = 0; i < companiesData.length; i += chunkSize) {
      await db.insert(companies).values(companiesData.slice(i, i + chunkSize)).onConflictDoNothing().execute();
    }
  }

  // ── Blog Posts ─────────────────────────────────────────────────────────────
  async getPosts() { return db.select().from(posts).orderBy(desc(posts.createdAt)); }
  async getPostBySlug(slug: string) { const [p] = await db.select().from(posts).where(eq(posts.slug, slug)); return p; }
  async createPost(post: InsertPost) { const [p] = await db.insert(posts).values(post).returning(); return p; }
  async updatePost(id: number, post: Partial<InsertPost>) {
    const [p] = await db.update(posts).set({ ...post, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
    return p;
  }
  async deletePost(id: number) { await db.delete(posts).where(eq(posts.id, id)); }

  // ── Articles ───────────────────────────────────────────────────────────────
  async getArticles() { return db.select().from(articles).orderBy(desc(articles.createdAt)); }
  async getArticleBySlug(slug: string) { const [a] = await db.select().from(articles).where(eq(articles.slug, slug)); return a; }
  async createArticle(article: InsertArticle) { const [a] = await db.insert(articles).values(article).returning(); return a; }
  async updateArticle(id: number, article: Partial<InsertArticle>) {
    const [a] = await db.update(articles).set({ ...article, updatedAt: new Date() }).where(eq(articles.id, id)).returning();
    return a;
  }
  async deleteArticle(id: number) { await db.delete(articles).where(eq(articles.id, id)); }

  // ── FAQs ───────────────────────────────────────────────────────────────────
  async getFaqs() { return db.select().from(faqs).orderBy(faqs.order); }
  async createFaq(faq: InsertFaq) { const [f] = await db.insert(faqs).values(faq).returning(); return f; }

  // ── Services ───────────────────────────────────────────────────────────────
  async getServices() { return db.select().from(services).orderBy(asc(services.order), asc(services.id)); }
  async createService(service: InsertService) { const [s] = await db.insert(services).values(service).returning(); return s; }
  async deleteService(id: number) { await db.delete(services).where(eq(services.id, id)); }

  // ── AI Auto-Blog Topics ────────────────────────────────────────────────────
  async getAiTopics() { return db.select().from(aiTopics).orderBy(desc(aiTopics.id)); }
  async createAiTopic(topic: InsertAiTopic) { const [t] = await db.insert(aiTopics).values(topic).returning(); return t; }
  async deleteAiTopic(id: number) { await db.delete(aiTopics).where(eq(aiTopics.id, id)); }
  async updateAiTopic(id: number, updates: Partial<AiTopic>) {
    const [t] = await db.update(aiTopics).set(updates).where(eq(aiTopics.id, id)).returning();
    return t;
  }
  async claimNextPendingAiTopic() {
    // Atomic claim: only one caller can flip a given row pending → generating.
    // SKIP LOCKED prevents two concurrent transactions from selecting the same row.
    const result = await db.execute(sql`
      UPDATE ai_topics SET status = 'generating', generated_at = NOW()
      WHERE id = (
        SELECT id FROM ai_topics WHERE status = 'pending'
        ORDER BY id ASC LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    const row: any = (result as any).rows?.[0];
    if (!row) return undefined;
    return {
      id: row.id, topic: row.topic, type: row.type, status: row.status,
      resultSlug: row.result_slug, errorMessage: row.error_message,
      createdAt: row.created_at, generatedAt: row.generated_at,
    } as AiTopic;
  }

  async recoverStaleAiTopics(maxAgeMs: number) {
    await db.execute(sql`
      UPDATE ai_topics SET status = 'pending'
      WHERE status = 'generating' AND generated_at < NOW() - make_interval(secs => ${maxAgeMs / 1000})
    `);
  }

  // ── Site Settings ──────────────────────────────────────────────────────────
  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async getSettings(keys: string[]): Promise<Record<string, string>> {
    const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, keys));
    return Object.fromEntries(rows.map(r => [r.key, r.value ?? ""]));
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
  }

  // ── Import Jobs ────────────────────────────────────────────────────────────
  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const [j] = await db.insert(importJobs).values(job).returning();
    return j;
  }

  async updateImportJob(id: number, data: Partial<InsertImportJob>): Promise<void> {
    await db.update(importJobs).set(data).where(eq(importJobs.id, id));
  }

  async getImportJob(id: number): Promise<ImportJob | undefined> {
    const [j] = await db.select().from(importJobs).where(eq(importJobs.id, id));
    return j;
  }

  async listImportJobs(limit = 50): Promise<ImportJob[]> {
    return db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(limit);
  }

  async createImportError(err: { importJobId: number; recordNumber?: number; errorType?: string; errorMessage?: string; identifier?: string }): Promise<void> {
    await db.insert(importErrors).values(err);
  }

  // Mark any jobs stuck in PROCESSING as FAILED (called on server startup)
  async markStaleJobsFailed(): Promise<void> {
    await db.update(importJobs)
      .set({ status: "FAILED", errorMessage: "Server restarted during import", completedAt: new Date() })
      .where(eq(importJobs.status, "PROCESSING"));
  }

  // ── Phase 7: Company Claims ────────────────────────────────────────────────
  async createClaim(claim: Omit<InsertClaim, "status" | "reviewedBy">): Promise<CompanyClaim> {
    const [c] = await db.insert(companyClaims).values({ ...claim, status: "pending" }).returning();
    return c;
  }

  async listClaims(status?: string): Promise<(CompanyClaim & { companyName: string | null })[]> {
    const rows = await db
      .select({
        id: companyClaims.id,
        companyId: companyClaims.companyId,
        userEmail: companyClaims.userEmail,
        userName: companyClaims.userName,
        phone: companyClaims.phone,
        message: companyClaims.message,
        status: companyClaims.status,
        reviewedBy: companyClaims.reviewedBy,
        reviewedAt: companyClaims.reviewedAt,
        createdAt: companyClaims.createdAt,
        companyName: companies.name,
      })
      .from(companyClaims)
      .leftJoin(companies, eq(companyClaims.companyId, companies.id))
      .where(status ? eq(companyClaims.status, status) : undefined)
      .orderBy(desc(companyClaims.createdAt));
    return rows as any;
  }

  async updateClaimStatus(id: number, status: "approved" | "rejected", reviewedBy: string): Promise<void> {
    await db.update(companyClaims).set({ status, reviewedBy, reviewedAt: new Date() }).where(eq(companyClaims.id, id));
    if (status === "approved") {
      const [claim] = await db.select().from(companyClaims).where(eq(companyClaims.id, id));
      if (claim) {
        // Automatically mark the company as claimed (badge) and refresh timestamp
        const [company] = await db.select().from(companies).where(eq(companies.id, claim.companyId));
        if (company) {
          let badges: string[] = [];
          try { badges = company.badges ? JSON.parse(company.badges) : []; } catch { badges = []; }
          if (!badges.includes("claimed")) badges.push("claimed");
          await db.update(companies)
            .set({ badges: JSON.stringify(badges), updatedAt: new Date() })
            .where(eq(companies.id, claim.companyId));
        }
      }
    }
  }

  // ── Phase 8: View tracking ─────────────────────────────────────────────────
  async incrementViewCount(companyId: number): Promise<void> {
    await db.update(companies)
      .set({ viewCount: sql`COALESCE(${companies.viewCount}, 0) + 1` })
      .where(eq(companies.id, companyId));
    // Invalidate trending cache
    cache.invalidate("trending:");
  }

  async getTrendingCompanies(limit = 6, countryCode?: string): Promise<Company[]> {
    const cacheKey = `trending:${countryCode || "global"}:${limit}`;
    const cached = cache.get<Company[]>(cacheKey);
    if (cached) return cached;
    const conditions = countryCode ? eq(companies.countryCode, countryCode.toUpperCase()) : undefined;
    const results = await db.select().from(companies)
      .where(conditions)
      .orderBy(desc(sql`COALESCE(${companies.viewCount}, 0)`), desc(companies.id))
      .limit(limit);
    cache.set(cacheKey, results, 5 * 60_000); // 5 min
    return results;
  }

  // ── Phase 11: Watchlist ────────────────────────────────────────────────────
  async addToWatchlist(userEmail: string, companyId: number): Promise<UserWatchlistItem> {
    const existing = await db.select().from(userWatchlist)
      .where(sql`${userWatchlist.userEmail} = ${userEmail} AND ${userWatchlist.companyId} = ${companyId}`)
      .limit(1);
    if (existing.length) return existing[0];
    const [item] = await db.insert(userWatchlist).values({ userEmail, companyId }).returning();
    return item;
  }

  async removeFromWatchlist(userEmail: string, companyId: number): Promise<void> {
    await db.delete(userWatchlist)
      .where(sql`${userWatchlist.userEmail} = ${userEmail} AND ${userWatchlist.companyId} = ${companyId}`);
  }

  async getUserWatchlist(userEmail: string, page = 1, limit = 12): Promise<{ data: Company[]; total: number }> {
    const offset = (page - 1) * limit;
    const [{ total }] = await db.select({ total: count() }).from(userWatchlist)
      .where(eq(userWatchlist.userEmail, userEmail));
    const rows = await db.select({ company: companies }).from(userWatchlist)
      .innerJoin(companies, eq(userWatchlist.companyId, companies.id))
      .where(eq(userWatchlist.userEmail, userEmail))
      .orderBy(desc(userWatchlist.createdAt))
      .limit(limit).offset(offset);
    return { data: rows.map(r => r.company), total };
  }

  async isInWatchlist(userEmail: string, companyId: number): Promise<boolean> {
    const [row] = await db.select({ id: userWatchlist.id }).from(userWatchlist)
      .where(sql`${userWatchlist.userEmail} = ${userEmail} AND ${userWatchlist.companyId} = ${companyId}`)
      .limit(1);
    return !!row;
  }

  // ── Phase 15: Compare ──────────────────────────────────────────────────────
  async getCompaniesByIds(ids: number[]): Promise<Company[]> {
    if (!ids.length) return [];
    return db.select().from(companies).where(inArray(companies.id, ids));
  }

  // ── Phase 16: Newsletter ───────────────────────────────────────────────────
  async subscribeNewsletter(email: string, name?: string, source = "website"): Promise<{ isNew: boolean }> {
    const existing = await db.select({ id: newsletterSubscribers.id, active: newsletterSubscribers.active })
      .from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
    if (existing.length) {
      if (!existing[0].active) {
        await db.update(newsletterSubscribers)
          .set({ active: true, unsubscribedAt: null } as any)
          .where(eq(newsletterSubscribers.email, email));
        return { isNew: false };
      }
      return { isNew: false };
    }
    await db.insert(newsletterSubscribers).values({ email, name, source });
    return { isNew: true };
  }

  async listSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async unsubscribeNewsletter(email: string): Promise<void> {
    await db.update(newsletterSubscribers)
      .set({ active: false, unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));
  }

  // ── Phase 17: User profile helpers ────────────────────────────────────────
  async listUserClaims(userEmail: string): Promise<(CompanyClaim & { companyName: string | null })[]> {
    const rows = await db.select({
      id: companyClaims.id,
      companyId: companyClaims.companyId,
      userEmail: companyClaims.userEmail,
      userName: companyClaims.userName,
      phone: companyClaims.phone,
      message: companyClaims.message,
      status: companyClaims.status,
      reviewedBy: companyClaims.reviewedBy,
      reviewedAt: companyClaims.reviewedAt,
      createdAt: companyClaims.createdAt,
      companyName: companies.name,
    }).from(companyClaims)
      .leftJoin(companies, eq(companyClaims.companyId, companies.id))
      .where(eq(companyClaims.userEmail, userEmail))
      .orderBy(desc(companyClaims.createdAt));
    return rows as any;
  }

  async listUserSuggestions(userEmail: string): Promise<(CompanySuggestion & { companyName: string | null })[]> {
    const rows = await db.select({
      id: companySuggestions.id,
      companyId: companySuggestions.companyId,
      userEmail: companySuggestions.userEmail,
      fieldName: companySuggestions.fieldName,
      currentValue: companySuggestions.currentValue,
      suggestedValue: companySuggestions.suggestedValue,
      reason: companySuggestions.reason,
      status: companySuggestions.status,
      reviewedBy: companySuggestions.reviewedBy,
      reviewedAt: companySuggestions.reviewedAt,
      createdAt: companySuggestions.createdAt,
      companyName: companies.name,
    }).from(companySuggestions)
      .leftJoin(companies, eq(companySuggestions.companyId, companies.id))
      .where(eq(companySuggestions.userEmail, userEmail))
      .orderBy(desc(companySuggestions.createdAt));
    return rows as any;
  }

  // ── Phase 19: Reviews ──────────────────────────────────────────────────────
  async createReview(review: Omit<InsertReview, "status" | "reviewedBy">): Promise<CompanyReview> {
    const [r] = await db.insert(companyReviews).values({ ...review, status: "pending" }).returning();
    return r;
  }

  async getCompanyReviews(companyId: number): Promise<{ reviews: CompanyReview[]; avg: number; total: number }> {
    const reviews = await db.select().from(companyReviews)
      .where(and(eq(companyReviews.companyId, companyId), eq(companyReviews.status, "approved")))
      .orderBy(desc(companyReviews.createdAt));
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    return { reviews, avg: Math.round(avg * 10) / 10, total };
  }

  async listReviews(status?: string): Promise<(CompanyReview & { companyName: string | null })[]> {
    const rows = await db.select({
      id: companyReviews.id,
      companyId: companyReviews.companyId,
      userEmail: companyReviews.userEmail,
      userName: companyReviews.userName,
      rating: companyReviews.rating,
      comment: companyReviews.comment,
      status: companyReviews.status,
      reviewedBy: companyReviews.reviewedBy,
      reviewedAt: companyReviews.reviewedAt,
      createdAt: companyReviews.createdAt,
      companyName: companies.name,
    }).from(companyReviews)
      .leftJoin(companies, eq(companyReviews.companyId, companies.id))
      .where(status ? eq(companyReviews.status, status) : undefined)
      .orderBy(desc(companyReviews.createdAt));
    return rows as any;
  }

  async updateReviewStatus(id: number, status: "approved" | "rejected", reviewedBy: string): Promise<void> {
    await db.update(companyReviews)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(companyReviews.id, id));
  }

  // ── Phase 21: Recent Activity ──────────────────────────────────────────────
  async getRecentlyUpdated(limit = 6, countryCode?: string): Promise<Company[]> {
    const conditions = countryCode ? [eq(companies.countryCode, countryCode.toUpperCase())] : [];
    const whereClause = conditions.length ? sql`${sql.join(conditions, sql` AND `)}` : undefined;
    return db.select().from(companies)
      .where(whereClause)
      .orderBy(desc(companies.updatedAt))
      .limit(limit);
  }

  // ── Phase 24: Bulk Update ──────────────────────────────────────────────────
  async bulkUpdateCompanies(ids: number[], fields: Partial<InsertCompany>): Promise<number> {
    if (!ids.length || !Object.keys(fields).length) return 0;
    await db.update(companies).set({ ...fields, updatedAt: new Date() }).where(inArray(companies.id, ids));
    return ids.length;
  }

  // ── Phase 14: Data Correction Suggestions ─────────────────────────────────
  async createSuggestion(suggestion: Omit<InsertSuggestion, "status" | "reviewedBy">): Promise<CompanySuggestion> {
    const [s] = await db.insert(companySuggestions).values({ ...suggestion, status: "pending" }).returning();
    return s;
  }

  async listSuggestions(status?: string): Promise<(CompanySuggestion & { companyName: string | null })[]> {
    const rows = await db.select({
      id: companySuggestions.id,
      companyId: companySuggestions.companyId,
      userEmail: companySuggestions.userEmail,
      fieldName: companySuggestions.fieldName,
      currentValue: companySuggestions.currentValue,
      suggestedValue: companySuggestions.suggestedValue,
      reason: companySuggestions.reason,
      status: companySuggestions.status,
      reviewedBy: companySuggestions.reviewedBy,
      reviewedAt: companySuggestions.reviewedAt,
      createdAt: companySuggestions.createdAt,
      companyName: companies.name,
    }).from(companySuggestions)
      .leftJoin(companies, eq(companySuggestions.companyId, companies.id))
      .where(status ? eq(companySuggestions.status, status) : undefined)
      .orderBy(desc(companySuggestions.createdAt));
    return rows as any;
  }

  async updateSuggestionStatus(id: number, status: "applied" | "dismissed", reviewedBy: string): Promise<{ applied: boolean; fieldName?: string }> {
    const [suggestion] = await db.select().from(companySuggestions).where(eq(companySuggestions.id, id));
    if (!suggestion) return { applied: false };

    await db.update(companySuggestions)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(companySuggestions.id, id));

    // When approved, automatically apply the suggested value to the company record
    if (status === "applied" && suggestion.fieldName && suggestion.suggestedValue != null) {
      const applied = await this.applyFieldToCompany(suggestion.companyId, suggestion.fieldName, suggestion.suggestedValue);
      return { applied, fieldName: suggestion.fieldName };
    }
    return { applied: false };
  }

  /** Whitelisted, normalized mapping of suggestion field names → company columns. */
  private static SUGGESTION_FIELD_MAP: Record<string, keyof typeof companies.$inferInsert> = {
    name: "name", status: "status", class: "class", category: "category",
    subcategory: "subCategory", "sub category": "subCategory", "sub-category": "subCategory",
    email: "email", phone: "phone", address: "address", state: "state", city: "city",
    pincode: "pincode", district: "district", industry: "industry", roc: "roc",
    country: "country",
    incorporationdate: "incorporationDate", "incorporation date": "incorporationDate",
    lastagmdate: "lastAgmDate", "last agm date": "lastAgmDate",
    lastbalancesheetdate: "lastBalanceSheetDate", "last balance sheet date": "lastBalanceSheetDate",
    authorizedcapital: "authorizedCapital", "authorized capital": "authorizedCapital",
    paidupcapital: "paidUpCapital", "paid up capital": "paidUpCapital",
  };

  async applyFieldToCompany(companyId: number, fieldName: string, value: string): Promise<boolean> {
    const key = fieldName.trim().toLowerCase();
    const column = DatabaseStorage.SUGGESTION_FIELD_MAP[key];
    if (!column) return false;
    let parsed: any = value;
    if (column === "authorizedCapital" || column === "paidUpCapital") {
      const n = Number(String(value).replace(/[,₹$\s]/g, ""));
      if (!Number.isFinite(n)) return false;
      parsed = n;
    }
    await db.update(companies)
      .set({ [column]: parsed, updatedAt: new Date() } as any)
      .where(eq(companies.id, companyId));
    return true;
  }

  // ── Phase 26: Company Badges ──────────────────────────────────────────────
  async updateCompanyBadges(id: number, badges: string[]): Promise<void> {
    await db.update(companies).set({ badges: JSON.stringify(badges) }).where(eq(companies.id, id));
  }

  // ── Phase 27: Saved Searches ──────────────────────────────────────────────
  async getSavedSearches(userEmail: string): Promise<SavedSearch[]> {
    return db.select().from(savedSearches)
      .where(eq(savedSearches.userEmail, userEmail))
      .orderBy(desc(savedSearches.createdAt));
  }

  async createSavedSearch(userEmail: string, name: string, filters: string): Promise<SavedSearch> {
    const [s] = await db.insert(savedSearches).values({ userEmail, name, filters }).returning();
    return s;
  }

  async deleteSavedSearch(id: number, userEmail: string): Promise<void> {
    await db.delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userEmail, userEmail)));
  }

  // ── Phase 29: User Management ─────────────────────────────────────────────
  async listAllUsers(limit = 100): Promise<AuthUser[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async isAdmin(email: string): Promise<boolean> {
    if (!email) return false;
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return !!admin;
  }

  async addAdmin(email: string): Promise<void> {
    await db.insert(admins).values({ email }).onConflictDoNothing();
  }

  async getAdminPasswordHash(email: string): Promise<string | null> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin?.passwordHash ?? null;
  }

  async setAdminPassword(email: string, passwordHash: string): Promise<void> {
    await db
      .insert(admins)
      .values({ email, passwordHash })
      .onConflictDoUpdate({ target: admins.email, set: { passwordHash } });
  }

  // ── Indian LLPs ─────────────────────────────────────────────────────────
  async getLlps(page: number, limit: number, search?: string, state?: string, status?: string) {
    const offset = (page - 1) * limit;
    const conds = [];
    if (search) {
      const q = `%${search.trim()}%`;
      conds.push(sql`(${llps.name} ILIKE ${q} OR ${llps.llpin} ILIKE ${q})`);
    }
    if (state) conds.push(eq(llps.state, state));
    if (status) conds.push(eq(llps.status, status));
    const where = conds.length ? and(...conds) : undefined;
    const [data, [{ value: total }]] = await Promise.all([
      db.select().from(llps).where(where).orderBy(asc(llps.name)).limit(limit).offset(offset),
      db.select({ value: count() }).from(llps).where(where),
    ]);
    return { data, total };
  }
  async getLlp(id: number) {
    const [row] = await db.select().from(llps).where(eq(llps.id, id));
    return row;
  }
  async createLlp(llp: InsertLlp) {
    const [row] = await db.insert(llps).values(llp).returning();
    return row;
  }
  async updateLlp(id: number, llp: Partial<InsertLlp>) {
    const [row] = await db.update(llps).set({ ...llp, updatedAt: new Date() }).where(eq(llps.id, id)).returning();
    return row;
  }
  async deleteLlp(id: number) {
    await db.delete(llps).where(eq(llps.id, id));
  }
  async getRelatedLlps(excludeId: number, state?: string | null, limit = 6): Promise<Llp[]> {
    const { ne } = await import("drizzle-orm");
    // Prefer same-state LLPs, then fill from anywhere (alphabetical)
    const results: Llp[] = [];
    if (state) {
      results.push(...await db.select().from(llps)
        .where(and(ne(llps.id, excludeId), ilike(llps.state, state)))
        .orderBy(asc(llps.name)).limit(limit));
    }
    if (results.length < limit) {
      const excludeIds = [excludeId, ...results.map(r => r.id)];
      results.push(...await db.select().from(llps)
        .where(sql`${llps.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`)
        .orderBy(asc(llps.name)).limit(limit - results.length));
    }
    return results;
  }
  async bulkUpsertLlps(rows: InsertLlp[]) {
    let imported = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const withLlpin = chunk.filter(r => r.llpin);
      const withoutLlpin = chunk.filter(r => !r.llpin);
      if (withLlpin.length) {
        const res = await db.insert(llps).values(withLlpin)
          .onConflictDoUpdate({
            target: llps.llpin,
            set: {
              name: sql`excluded.name`,
              registrationDate: sql`excluded.registration_date`,
              roc: sql`excluded.roc`,
              state: sql`excluded.state`,
              district: sql`excluded.district`,
              status: sql`excluded.status`,
              industry: sql`excluded.industry`,
              address: sql`excluded.address`,
              email: sql`excluded.email`,
              totalObligation: sql`excluded.total_obligation`,
              updatedAt: new Date(),
            },
          })
          .returning({ id: llps.id });
        imported += res.length;
      }
      if (withoutLlpin.length) {
        // No LLPIN to upsert on — match by name so re-imports update instead of duplicating.
        const names = withoutLlpin.map(r => r.name);
        const existing = await db.select({ id: llps.id, name: llps.name }).from(llps)
          .where(and(isNull(llps.llpin), inArray(llps.name, names)));
        const byName = new Map(existing.map(e => [e.name, e.id]));
        const toInsert = withoutLlpin.filter(r => !byName.has(r.name));
        for (const r of withoutLlpin) {
          const id = byName.get(r.name);
          if (id !== undefined) {
            await db.update(llps).set({ ...r, updatedAt: new Date() }).where(eq(llps.id, id));
            imported += 1;
          }
        }
        if (toInsert.length) {
          const res = await db.insert(llps).values(toInsert).returning({ id: llps.id });
          imported += res.length;
        }
      }
    }
    return { imported };
  }

  // ── Bank IFSC codes ─────────────────────────────────────────────────────
  async getIfscCodes(page: number, limit: number, search?: string, bank?: string, state?: string) {
    const offset = (page - 1) * limit;
    const conds = [];
    if (search) {
      const q = `%${search.trim()}%`;
      conds.push(sql`(${ifscCodes.ifsc} ILIKE ${q} OR ${ifscCodes.bank} ILIKE ${q} OR ${ifscCodes.branch} ILIKE ${q} OR ${ifscCodes.city} ILIKE ${q})`);
    }
    if (bank) conds.push(eq(ifscCodes.bank, bank));
    if (state) conds.push(eq(ifscCodes.state, state));
    const where = conds.length ? and(...conds) : undefined;
    const [data, [{ value: total }]] = await Promise.all([
      db.select().from(ifscCodes).where(where).orderBy(asc(ifscCodes.bank), asc(ifscCodes.branch)).limit(limit).offset(offset),
      db.select({ value: count() }).from(ifscCodes).where(where),
    ]);
    return { data, total };
  }
  async getIfscByCode(ifsc: string) {
    const [row] = await db.select().from(ifscCodes).where(eq(ifscCodes.ifsc, ifsc.toUpperCase()));
    return row;
  }
  async createIfsc(rowIn: InsertIfsc) {
    const [row] = await db.insert(ifscCodes).values({ ...rowIn, ifsc: rowIn.ifsc.toUpperCase() }).returning();
    return row;
  }
  async updateIfsc(id: number, rowIn: Partial<InsertIfsc>) {
    const patch = { ...rowIn };
    if (patch.ifsc) patch.ifsc = patch.ifsc.toUpperCase();
    const [row] = await db.update(ifscCodes).set(patch).where(eq(ifscCodes.id, id)).returning();
    return row;
  }
  async deleteIfsc(id: number) {
    await db.delete(ifscCodes).where(eq(ifscCodes.id, id));
  }
  async bulkUpsertIfsc(rows: InsertIfsc[]) {
    let imported = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const res = await db.insert(ifscCodes).values(chunk)
        .onConflictDoUpdate({
          target: ifscCodes.ifsc,
          set: {
            bank: sql`excluded.bank`,
            branch: sql`excluded.branch`,
            district: sql`excluded.district`,
            state: sql`excluded.state`,
            address: sql`excluded.address`,
            city: sql`excluded.city`,
          },
        })
        .returning({ id: ifscCodes.id });
      imported += res.length;
    }
    return { imported };
  }
}

export const storage = new DatabaseStorage();
