import { db } from "./db";
import { companies, type InsertCompany, type Company, admins } from "@shared/schema";
import { eq, ilike, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(page: number, limit: number, search?: string): Promise<{ data: Company[]; total: number }>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;
  bulkCreateCompanies(companiesData: InsertCompany[]): Promise<void>;

  // Admin
  isAdmin(email: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCompanies(page: number, limit: number, search?: string): Promise<{ data: Company[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause = undefined;
    if (search) {
      whereClause = sql`
        (${companies.name} ILIKE ${`%${search}%`} OR 
         ${companies.cin} ILIKE ${`%${search}%`} OR 
         ${companies.email} ILIKE ${`%${search}%`})`;
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(companies)
      .where(whereClause);
      
    const total = totalResult.count;

    const data = await db
      .select()
      .from(companies)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(companies.id)); // Default sort by ID desc (newest first)

    return { data, total };
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async bulkCreateCompanies(companiesData: InsertCompany[]): Promise<void> {
    if (companiesData.length === 0) return;
    
    // Process in chunks of 1000 to avoid query size limits
    const chunkSize = 1000;
    for (let i = 0; i < companiesData.length; i += chunkSize) {
      const chunk = companiesData.slice(i, i + chunkSize);
      await db.insert(companies).values(chunk).onConflictDoNothing().execute();
    }
  }

  async isAdmin(email: string): Promise<boolean> {
    // For now, let's just return true if the user is authenticated 
    // OR check against the admins table.
    // If admins table is empty, maybe allow the first user?
    // Let's implement a strict check against admins table + a hardcoded fallback for the owner.
    
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return !!admin;
  }
}

export const storage = new DatabaseStorage();
