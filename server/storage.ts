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
} from "@shared/schema";
import { eq, ilike, desc, count, sql, asc } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string, countryCode?: string, state?: string): Promise<{ data: Company[]; total: number }>;
  getCompany(id: number): Promise<Company | undefined>;
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

  // Import Jobs
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  updateImportJob(id: number, data: Partial<InsertImportJob>): Promise<void>;
  getImportJob(id: number): Promise<ImportJob | undefined>;
  listImportJobs(limit?: number): Promise<ImportJob[]>;
  createImportError(err: { importJobId: number; recordNumber?: number; errorType?: string; errorMessage?: string; identifier?: string }): Promise<void>;
  markStaleJobsFailed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ── Companies ──────────────────────────────────────────────────────────────
  async getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string, countryCode?: string, state?: string) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (search) conditions.push(sql`(${companies.name} ILIKE ${`%${search}%`} OR ${companies.cin} ILIKE ${`%${search}%`} OR ${companies.email} ILIKE ${`%${search}%`})`);
    if (alphabet) {
      if (/^[0-9]$/.test(alphabet)) conditions.push(sql`${companies.name} ~ '^[0-9]'`);
      else conditions.push(ilike(companies.name, `${alphabet}%`));
    }
    // country_code filter (new, preferred) — exact ISO match
    if (countryCode) conditions.push(eq(companies.countryCode, countryCode.toUpperCase()));
    // legacy free-text country filter (backward compat)
    else if (country) conditions.push(ilike(companies.country, country));
    // state filter (new)
    if (state) conditions.push(ilike(companies.state, state));

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const [{ count: total }] = await db.select({ count: count() }).from(companies).where(whereClause);
    const data = await db.select().from(companies).where(whereClause).limit(limit).offset(offset).orderBy(desc(companies.id));
    return { data, total };
  }

  async getCompany(id: number) {
    const [c] = await db.select().from(companies).where(eq(companies.id, id));
    return c;
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
