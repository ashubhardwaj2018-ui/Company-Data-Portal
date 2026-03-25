import { db } from "./db";
import { companies, type InsertCompany, type Company, admins, posts, faqs, type Post, type InsertPost, type Faq, type InsertFaq } from "@shared/schema";
import { eq, ilike, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string): Promise<{ data: Company[]; total: number }>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;
  bulkCreateCompanies(companiesData: InsertCompany[]): Promise<void>;

  // Blogs & FAQs
  getPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  getFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;

  // Admin
  isAdmin(email: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCompanies(page: number, limit: number, search?: string, alphabet?: string, country?: string): Promise<{ data: Company[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause = undefined;
    const conditions = [];

    if (search) {
      conditions.push(sql`(${companies.name} ILIKE ${`%${search}%`} OR ${companies.cin} ILIKE ${`%${search}%`} OR ${companies.email} ILIKE ${`%${search}%`})`);
    }

    if (alphabet) {
      if (/^[0-9]$/.test(alphabet)) {
        conditions.push(sql`${companies.name} ~ '^[0-9]'`);
      } else {
        conditions.push(ilike(companies.name, `${alphabet}%`));
      }
    }

    if (country) {
      conditions.push(ilike(companies.country, country));
    }

    if (conditions.length > 0) {
      whereClause = sql`${sql.join(conditions, sql` AND `)}`;
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
      .orderBy(desc(companies.id));

    return { data, total };
  }

  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post;
  }

  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getFaqs(): Promise<Faq[]> {
    return await db.select().from(faqs).orderBy(faqs.order);
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const [newFaq] = await db.insert(faqs).values(faq).returning();
    return newFaq;
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
