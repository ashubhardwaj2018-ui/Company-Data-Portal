import { pgTable, text, serial, integer, boolean, timestamp, bigint, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
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
  country: text("country").default("India"),
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
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export const companyQuerySchema = z.object({
  search: z.string().optional(),
  alphabet: z.string().length(1).optional(),
  country: z.string().optional(),
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
