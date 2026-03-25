import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import * as xlsx from "xlsx";
import { insertCompanySchema, companies, type InsertCompany } from "@shared/schema";
import { db } from "./db";
import { count } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to check admin status
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // For MVP, just allow any logged in user to be admin 
    // OR uncomment below to enforce admin check
    // const isAdmin = await storage.isAdmin(req.user.email);
    // if (!isAdmin) {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    next();
  };

  // --- API Routes ---

  // List Companies
  app.get(api.companies.list.path, async (req, res) => {
    try {
      const input = api.companies.list.input.parse(req.query);
      const { data, total } = await storage.getCompanies(input.page, input.limit, input.search, input.alphabet, input.country);
      res.json({
        data,
        total,
        page: input.page,
        limit: input.limit
      });
    } catch (error) {
       console.error(error);
       res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Blog Posts
  app.get(api.posts.list.path, async (req, res) => {
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  });

  // FAQs
  app.get(api.faqs.list.path, async (req, res) => {
    const faqs = await storage.getFaqs();
    res.json(faqs);
  });

  // Get Company
  app.get(api.companies.get.path, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  });

  // Admin: Create
  app.post(api.companies.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Admin: Update
  app.put(api.companies.update.path, requireAdmin, async (req, res) => {
     try {
      const input = api.companies.update.input.parse(req.body);
      const company = await storage.updateCompany(Number(req.params.id), input);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Admin: Delete
  app.delete(api.companies.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteCompany(Number(req.params.id));
    res.status(204).send();
  });

  // Admin: Upload Excel
  app.post(api.companies.upload.path, requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData: any[] = xlsx.utils.sheet_to_json(sheet);

      const totalRows = rawData.length;
      const validCompanies: InsertCompany[] = [];
      const skippedRows: { row: number; reason: string }[] = [];

      rawData.forEach((row: any, index: number) => {
        const rowNum = index + 2; // 1-based, skip header

        const mapped = {
          cin:               row['CIN'] || row['cin'] || row['Registration Number'] || row['registration_number'] || undefined,
          name:              row['Name'] || row['name'] || row['Company Name'] || row['company_name'],
          status:            row['Status'] || row['status'],
          class:             row['Class'] || row['class'] || row['Company Class'] || row['company_class'],
          category:          row['Category'] || row['category'],
          subCategory:       row['Sub Category'] || row['sub_category'] || row['SubCategory'],
          state:             row['State'] || row['state'],
          city:              row['City'] || row['city'],
          pincode:           row['Pincode'] || row['pincode'] || row['Pin Code'],
          email:             row['Email'] || row['email'],
          phone:             row['Phone'] || row['phone'] || row['Mobile'],
          address:           row['Address'] || row['address'] || row['Registered Address'],
          roc:               row['ROC'] || row['roc'] || row['Registrar of Companies'],
          country:           row['Country'] || row['country'] || 'India',
          incorporationDate: row['Incorporation Date'] || row['incorporation_date'] || row['Date of Incorporation'] || undefined,
          lastAgmDate:       row['Last AGM Date'] || row['last_agm_date'] || undefined,
          lastBalanceSheetDate: row['Last Balance Sheet Date'] || row['last_balance_sheet_date'] || undefined,
          authorizedCapital: row['Authorized Capital'] ? Number(String(row['Authorized Capital']).replace(/[^0-9.]/g, '')) : undefined,
          paidUpCapital:     row['Paid Up Capital'] ? Number(String(row['Paid Up Capital']).replace(/[^0-9.]/g, '')) : undefined,
          customQna:         row['Custom QnA'] || row['custom_qna'] || undefined,
        };

        if (!mapped.name) {
          skippedRows.push({ row: rowNum, reason: "Missing Company Name" });
          return;
        }

        const parsed = insertCompanySchema.safeParse(mapped);
        if (parsed.success) {
          validCompanies.push(parsed.data);
        } else {
          const firstError = parsed.error.errors[0];
          skippedRows.push({ row: rowNum, reason: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : "Validation failed" });
        }
      });

      const inserted = await storage.bulkCreateCompanies(validCompanies);

      res.json({
        message: "Upload complete",
        totalRows,
        inserted: validCompanies.length,
        skipped: skippedRows.length,
        skippedDetails: skippedRows.slice(0, 20), // return at most 20 skipped rows
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process file. Please check the file format and try again." });
    }
  });

  // Admin Check
  app.get(api.admin.check.path, async (req, res) => {
    const isAdmin = req.isAuthenticated(); // For now, all logged in users are admins
    res.json({ isAdmin });
  });

  // Blog Admin
  app.post("/api/admin/posts", requireAdmin, async (req, res) => {
    try {
      const input = insertPostSchema.parse(req.body);
      const post = await storage.createPost(input);
      res.status(201).json(post);
    } catch (err) {
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  // FAQ Admin
  app.post("/api/admin/faqs", requireAdmin, async (req, res) => {
    try {
      const input = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(input);
      res.status(201).json(faq);
    } catch (err) {
      res.status(400).json({ message: "Invalid FAQ data" });
    }
  });

  // Seed Data
  if (process.env.NODE_ENV !== "production") {
    const existingCount = await db.select({ count: count() }).from(companies);
    if (existingCount[0].count === 0) {
      console.log("Seeding data...");
      const dummyCompanies: InsertCompany[] = [
        {
          cin: "L17110MH1973PLC019786",
          name: "Reliance Industries Limited",
          status: "Active",
          class: "Public",
          category: "Company limited by shares",
          subCategory: "Non-govt company",
          authorizedCapital: 15000000000,
          paidUpCapital: 6765000000,
          state: "Maharashtra",
          city: "Mumbai",
          email: "investor.relations@ril.com",
          phone: "+91-22-35555000",
          address: "3rd Floor, Maker Chambers IV, 222, Nariman Point, Mumbai, Maharashtra, 400021",
          incorporationDate: new Date("1973-05-08").toISOString(),
          lastAgmDate: new Date("2023-08-28").toISOString(),
          lastBalanceSheetDate: new Date("2023-03-31").toISOString(),
        },
        {
          cin: "L65990MH1945PLC004558",
          name: "Tata Motors Limited",
          status: "Active",
          class: "Public",
          category: "Company limited by shares",
          subCategory: "Non-govt company",
          authorizedCapital: 4000000000,
          paidUpCapital: 765000000,
          state: "Maharashtra",
          city: "Mumbai",
          email: "inv_rel@tatamotors.com",
          phone: "+91-22-66658282",
          address: "Bombay House, 24 Homi Mody Street, Mumbai, Maharashtra, 400001",
          incorporationDate: new Date("1945-09-01").toISOString(),
          lastAgmDate: new Date("2023-07-05").toISOString(),
          lastBalanceSheetDate: new Date("2023-03-31").toISOString(),
        },
        {
          cin: "L72200KA1996PLC019635",
          name: "Infosys Limited",
          status: "Active",
          class: "Public",
          category: "Company limited by shares",
          subCategory: "Non-govt company",
          authorizedCapital: 2400000000,
          paidUpCapital: 2074000000,
          state: "Karnataka",
          city: "Bengaluru",
          email: "investors@infosys.com",
          phone: "+91-80-28520261",
          address: "Electronics City, Hosur Road, Bengaluru, Karnataka, 560100",
          incorporationDate: new Date("1981-07-02").toISOString(),
          lastAgmDate: new Date("2023-06-28").toISOString(),
          lastBalanceSheetDate: new Date("2023-03-31").toISOString(),
        }
      ];
      await storage.bulkCreateCompanies(dummyCompanies);

      // Seed FAQs
      await storage.createFaq({
        question: "How do I search for a company?",
        answer: "You can use the search bar on the homepage or click on an alphabet to filter by name.",
        category: "General",
        order: 1
      });

      // Seed Post
      await storage.createPost({
        title: "Welcome to our Company Directory",
        slug: "welcome",
        content: "We are excited to launch our new directory service for Indian companies.",
        excerpt: "Launch of our new directory service.",
        published: true
      });

      console.log("Seeding completed.");
    }
  }

  return httpServer;
}
