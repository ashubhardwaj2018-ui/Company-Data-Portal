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
  companySuggestions, type CompanySuggestion,
} from "@shared/schema";
import { eq, ilike, desc, count, sql, asc } from "drizzle-orm";
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
  updateSuggestionStatus(id: number, status: "applied" | "dismissed", reviewedBy: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ── Companies ──────────────────────────────────────────────────────────────
  async getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string, countryCode?: string, state?: string, status?: string, city?: string) {
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

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const [{ count: total }] = await db.select({ count: count() }).from(companies).where(whereClause);
    const data = await db.select().from(companies).where(whereClause).limit(limit).offset(offset).orderBy(desc(companies.id));
    return { data, total };
  }

  async searchSuggestions(q: string, countryCode?: string, limit = 8) {
    const cacheKey = `suggest:${q.toLowerCase()}:${countryCode || ""}:${limit}`;
    const cached = cache.get<Awaited<ReturnType<DatabaseStorage["searchSuggestions"]>>>(cacheKey);
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

  async getDirectoryStats(countryCode?: string) {
    const cacheKey = `stats:${countryCode || "global"}`;
    const cached = cache.get<Awaited<ReturnType<DatabaseStorage["getDirectoryStats"]>>>(cacheKey);
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

    return db.select().from(companies).where(whereClause).orderBy(desc(companies.id)).limit(limit);
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

  // ── Site Settings ──────────────────────────────────────────────────────────
  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async getSettings(keys: string[]): Promise<Record<string, string>> {
    const rows = await db.select().from(siteSettings).where(sql`${siteSettings.key} = ANY(${keys})`);
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
      if (claim) await db.update(companies).set({ updatedAt: new Date() }).where(eq(companies.id, claim.companyId));
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

  async updateSuggestionStatus(id: number, status: "applied" | "dismissed", reviewedBy: string): Promise<void> {
    await db.update(companySuggestions)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(companySuggestions.id, id));
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
}

export const storage = new DatabaseStorage();
