import { pgTable, text, serial, integer, boolean, timestamp, bigint, date, varchar, index, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  // ── Global foundation fields (Phase 1) ───────────────────────────────────
  countryCode: varchar("country_code", { length: 2 }).default("IN"),   // ISO 3166-1 alpha-2
  registrationNumber: text("registration_number"),                       // Normalized global reg ID
  slug: text("slug"),                                                    // SEO slug (unique enforced via index)
  normalizedName: text("normalized_name"),                               // Lowercase/normalized for search
  industry: text("industry"),                                            // Industry/sector
  district: text("district"),                                            // Geographic district
  source: text("source"),                                                // Data provenance: MCA, ASIC, etc.
  // ── India-specific fields (preserved) ────────────────────────────────────
  cin: varchar("cin", { length: 21 }).unique(),
  name: text("name").notNull(),
  status: text("status"),
  class: text("class"),
  category: text("category"),
  subCategory: text("sub_category"),
  authorizedCapital: bigint("authorized_capital", { mode: "number" }),
  paidUpCapital: bigint("paid_up_capital", { mode: "number" }),
  state: text("state"),
  city: text("city"),
  pincode: text("pincode"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  roc: text("roc"),
  incorporationDate: date("incorporation_date"),
  lastAgmDate: date("last_agm_date"),
  lastBalanceSheetDate: date("last_balance_sheet_date"),
  customQna: text("custom_qna"),
  country: text("country").default("India"),                             // Kept for backward compat
  // ── Phase 8: view tracking ─────────────────────────────────────────────────
  viewCount: integer("view_count").default(0),
  badges: text("badges"),   // Phase 26 — JSON array e.g. ["verified","featured","claimed"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export const companyQuerySchema = z.object({
  search: z.string().optional(),
  alphabet: z.string().length(1).optional(),
  country: z.string().optional(),         // legacy free-text filter (backward compat)
  countryCode: z.string().length(2).optional(), // ISO code filter (new)
  state: z.string().optional(),
  status: z.string().optional(),          // e.g. "Active", "Strike-off"
  city: z.string().optional(),            // city ILIKE filter
  industry: z.string().optional(),        // Phase 18
  pincode: z.string().optional(),         // Phase 22
  minCapital: z.coerce.number().optional(), // Phase 25
  maxCapital: z.coerce.number().optional(), // Phase 25
  incorporatedAfter: z.string().optional(),  // Phase 25 — ISO date string
  incorporatedBefore: z.string().optional(), // Phase 25 — ISO date string
  sortBy: z.enum(["name", "capital", "incorporated", "views", "recent"]).optional(), // Phase 25
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});
export type CompanyQueryParams = z.infer<typeof companyQuerySchema>;

// ─── Blog Posts ───────────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  authorId: varchar("author_id"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

// ─── Articles (separate content type) ────────────────────────────────────────
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  category: text("category"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  authorId: varchar("author_id"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, createdAt: true, updatedAt: true });
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

// ─── FAQs ─────────────────────────────────────────────────────────────────────
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true });
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

// ─── Services (partner links) ─────────────────────────────────────────────────
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  icon: text("icon").default("🔗"),
  imageUrl: text("image_url"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

// ─── Site Settings (SEO, API keys, etc.) ─────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true, updatedAt: true });
export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

// ─── Import Jobs ──────────────────────────────────────────────────────────────
// Statuses: QUEUED → PROCESSING → COMPLETED | FAILED | CANCELLED
export const importJobs = pgTable("import_jobs", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 2 }).default("IN"),
  datasetType: text("dataset_type"),           // xml | xlsx | csv
  filename: text("filename"),
  fileSize: bigint("file_size", { mode: "number" }),
  status: text("status").notNull().default("QUEUED"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalRecords: integer("total_records"),
  processedRecords: integer("processed_records").default(0),
  insertedRecords: integer("inserted_records").default(0),
  updatedRecords: integer("updated_records").default(0),
  skippedRecords: integer("skipped_records").default(0),
  errorRecords: integer("error_records").default(0),
  errorMessage: text("error_message"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertImportJobSchema = createInsertSchema(importJobs).omit({ id: true, createdAt: true });
export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;

// ─── Import Errors ────────────────────────────────────────────────────────────
export const importErrors = pgTable("import_errors", {
  id: serial("id").primaryKey(),
  importJobId: integer("import_job_id").references(() => importJobs.id, { onDelete: "cascade" }),
  recordNumber: integer("record_number"),
  errorType: text("error_type"),       // VALIDATION | PARSE | DUPLICATE
  errorMessage: text("error_message"),
  identifier: text("identifier"),      // CIN or whatever ID was in the record
  createdAt: timestamp("created_at").defaultNow(),
});
export type ImportError = typeof importErrors.$inferSelect;

// ─── Company Claims (Phase 7) ─────────────────────────────────────────────────
// Allows business owners to claim and verify their listing.
// Statuses: pending → approved | rejected
export const companyClaims = pgTable("company_claims", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  phone: text("phone"),
  message: text("message"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertClaimSchema = createInsertSchema(companyClaims).omit({ id: true, createdAt: true, reviewedAt: true });
export type CompanyClaim = typeof companyClaims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

// ─── User Watchlist (Phase 11) ────────────────────────────────────────────────
export const userWatchlist = pgTable("user_watchlist", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type UserWatchlistItem = typeof userWatchlist.$inferSelect;

// ─── Data Correction Suggestions (Phase 14) ───────────────────────────────────
// Users flag stale / incorrect company data for admin review.
export const companySuggestions = pgTable("company_suggestions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userEmail: text("user_email").notNull(),
  fieldName: text("field_name").notNull(),   // e.g. "email", "phone", "address"
  currentValue: text("current_value"),
  suggestedValue: text("suggested_value").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending | applied | dismissed
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSuggestionSchema = createInsertSchema(companySuggestions).omit({ id: true, createdAt: true, reviewedAt: true });
export type CompanySuggestion = typeof companySuggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

// ─── Company Reviews / Ratings (Phase 19) ────────────────────────────────────
export const companyReviews = pgTable("company_reviews", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  rating: integer("rating").notNull(),                // 1–5
  comment: text("comment"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertReviewSchema = createInsertSchema(companyReviews).omit({ id: true, createdAt: true, reviewedAt: true });
export type CompanyReview = typeof companyReviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// ─── Saved Searches (Phase 27) ────────────────────────────────────────────────
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  filters: text("filters").notNull(),   // JSON-serialized filter object
  createdAt: timestamp("created_at").defaultNow(),
});
export type SavedSearch = typeof savedSearches.$inferSelect;

// ─── Newsletter Subscribers (Phase 16) ────────────────────────────────────────
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source").default("website"),          // website | import | admin
  active: boolean("active").notNull().default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
