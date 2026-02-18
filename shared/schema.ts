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
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export type CompanyQueryParams = z.infer<typeof companyQuerySchema>;
