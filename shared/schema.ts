import { pgTable, text, serial, integer, boolean, timestamp, bigint, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  cin: varchar("cin", { length: 21 }).unique(), // Corporate Identification Number
  name: text("name").notNull(),
  status: text("status"), // Active, Strike Off, etc.
  class: text("class"), // Public, Private
  category: text("category"), // Company limited by shares
  subCategory: text("sub_category"), // Non-govt company
  authorizedCapital: bigint("authorized_capital", { mode: "number" }),
  paidUpCapital: bigint("paid_up_capital", { mode: "number" }),
  state: text("state"),
  city: text("city"),
  pincode: text("pincode"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  roc: text("roc"), // Registrar of Companies
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
  updatedAt: true 
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Admin configuration
// In a real app, you'd have a roles table or column. 
// For simplicity, we'll check against a list of admin emails in the backend or add an isAdmin column if we could modify auth easily.
// Let's stick to a simple "is_admin" flag in a separate table or just use the user's email to verify admin status.
// Or better, let's create an 'admins' table to whitelist admin emails.

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

// API Schemas
export const companyQuerySchema = z.object({
  search: z.string().optional(),
  alphabet: z.string().length(1).optional(),
  country: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  authorId: varchar("author_id"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true });

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;


export type CompanyQueryParams = z.infer<typeof companyQuerySchema>;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  icon: text("icon").default("🔗"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
