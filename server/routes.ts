import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";
import * as os from "os";
import {
  insertCompanySchema, insertServiceSchema, insertPostSchema, insertFaqSchema,
  insertArticleSchema, companies,
} from "@shared/schema";
import { db } from "./db";
import { count } from "drizzle-orm";
import { processImportJob } from "./importProcessor";

// Disk storage — avoids OOM for large files, writes to OS temp dir
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB max
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ── Middleware ─────────────────────────────────────────────────────────────
  // requireAdmin: user must be (1) authenticated AND (2) in the admins table.
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const email: string | undefined = req.user?.claims?.email;
    if (!email) return res.status(401).json({ message: "Unauthorized" });
    const adminOk = await storage.isAdmin(email);
    if (!adminOk) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  // ── Companies ──────────────────────────────────────────────────────────────
  app.get(api.companies.list.path, async (req, res) => {
    try {
      const input = api.companies.list.input.parse(req.query);
      const { data, total } = await storage.getCompanies(input.page, input.limit, input.search, input.alphabet, input.country, input.countryCode, input.state);
      res.json({ data, total, page: input.page, limit: input.limit });
    } catch (e) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.get(api.companies.get.path, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  });

  // ── Country-aware slug lookup (/api/:countryCode/company/:slug) ────────────
  app.get("/api/:countryCode/company/:slug", async (req, res) => {
    try {
      const { countryCode, slug } = req.params;
      const allowed = ["in", "au", "gb", "sg"];
      if (!allowed.includes(countryCode.toLowerCase()))
        return res.status(400).json({ message: "Unsupported country code" });
      const company = await storage.getCompanyBySlug(countryCode, slug);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (e: any) {
      console.error("[slug lookup]", e.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Related companies (same state or ROC, excludes current) ───────────────
  app.get("/api/companies/:id/related", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const related = await storage.getRelatedCompanies(id, company.countryCode || "IN", company.state, company.roc, 6);
      res.json(related);
    } catch (e: any) {
      console.error("[related companies]", e.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.companies.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      res.status(201).json(await storage.createCompany(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.companies.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.companies.update.input.parse(req.body);
      const company = await storage.updateCompany(Number(req.params.id), input);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.companies.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteCompany(Number(req.params.id));
    res.status(204).send();
  });

  // ── File Upload → creates background import job ────────────────────────────
  app.post(api.companies.upload.path, requireAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const filePath   = (req.file as any).path as string;
    const origName   = ((req.file as any).originalname as string) || "";
    const fileSize   = ((req.file as any).size as number) || 0;
    const createdBy  = (req.user as any)?.claims?.email || "unknown";
    const ext        = origName.toLowerCase().split(".").pop() || "unknown";
    const allowedExt = ["xml", "xlsx", "xls", "csv"];
    if (!allowedExt.includes(ext)) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ message: `Unsupported file type: .${ext}. Allowed: ${allowedExt.join(", ")}` });
    }

    try {
      const job = await storage.createImportJob({
        countryCode: "IN",
        datasetType: ext,
        filename: origName,
        fileSize,
        status: "QUEUED",
        createdBy,
      });

      // Respond immediately — browser can now close safely
      res.json({ jobId: job.id, message: "Import queued. Track progress via jobId." });

      // Fire-and-forget background processing
      setImmediate(() => {
        processImportJob(job.id, filePath, origName, "IN").catch((err) => {
          console.error(`[import:${job.id}] Unhandled error:`, err);
        });
      });
    } catch (e: any) {
      fs.unlink(filePath, () => {});
      res.status(500).json({ message: "Failed to queue import job." });
    }
  });

  // ── Import Job status endpoints ─────────────────────────────────────────────
  app.get("/api/admin/import-jobs", requireAdmin, async (_req, res) => {
    res.json(await storage.listImportJobs(50));
  });

  app.get("/api/admin/import-jobs/:id", requireAdmin, async (req, res) => {
    const job = await storage.getImportJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Import job not found" });
    res.json(job);
  });

  // ── Blog Posts ─────────────────────────────────────────────────────────────
  app.get(api.posts.list.path, async (req, res) => res.json(await storage.getPosts()));
  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ message: "Not found" });
    res.json(post);
  });
  app.post("/api/admin/posts", requireAdmin, async (req, res) => {
    try { res.status(201).json(await storage.createPost(insertPostSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid post data" }); }
  });
  app.put("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    const post = await storage.updatePost(Number(req.params.id), req.body);
    if (!post) return res.status(404).json({ message: "Not found" });
    res.json(post);
  });
  app.delete("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    await storage.deletePost(Number(req.params.id));
    res.status(204).send();
  });

  // ── Articles ───────────────────────────────────────────────────────────────
  app.get("/api/articles", async (req, res) => res.json(await storage.getArticles()));
  app.get("/api/articles/:slug", async (req, res) => {
    const article = await storage.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ message: "Not found" });
    res.json(article);
  });
  app.post("/api/admin/articles", requireAdmin, async (req, res) => {
    try { res.status(201).json(await storage.createArticle(insertArticleSchema.parse(req.body))); }
    catch (err) { console.error(err); res.status(400).json({ message: "Invalid article data" }); }
  });
  app.put("/api/admin/articles/:id", requireAdmin, async (req, res) => {
    const article = await storage.updateArticle(Number(req.params.id), req.body);
    if (!article) return res.status(404).json({ message: "Not found" });
    res.json(article);
  });
  app.delete("/api/admin/articles/:id", requireAdmin, async (req, res) => {
    await storage.deleteArticle(Number(req.params.id));
    res.status(204).send();
  });

  // ── FAQs ───────────────────────────────────────────────────────────────────
  app.get(api.faqs.list.path, async (req, res) => res.json(await storage.getFaqs()));
  app.post("/api/admin/faqs", requireAdmin, async (req, res) => {
    try { res.status(201).json(await storage.createFaq(insertFaqSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid FAQ data" }); }
  });

  // ── Services ───────────────────────────────────────────────────────────────
  app.get("/api/services", async (req, res) => res.json(await storage.getServices()));
  app.post("/api/admin/services", requireAdmin, async (req, res) => {
    try { res.status(201).json(await storage.createService(insertServiceSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid service data" }); }
  });
  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.status(204).send();
  });

  // ── Site Settings (SEO) ────────────────────────────────────────────────────
  app.get("/api/settings", async (req, res) => {
    const keys = ["site_title", "site_description", "site_keywords", "og_image", "robots_txt", "openai_key"];
    res.json(await storage.getSettings(keys));
  });
  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = z.object({ key: z.string(), value: z.string() }).parse(req.body);
      await storage.setSetting(key, value);
      res.json({ success: true });
    } catch { res.status(400).json({ message: "Invalid settings data" }); }
  });
  app.post("/api/admin/settings/bulk", requireAdmin, async (req, res) => {
    try {
      const data = z.record(z.string()).parse(req.body);
      for (const [key, value] of Object.entries(data)) await storage.setSetting(key, value);
      res.json({ success: true });
    } catch { res.status(400).json({ message: "Invalid settings data" }); }
  });

  // ── Admin Management ───────────────────────────────────────────────────────
  app.get(api.admin.check.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const email: string | undefined = (req.user as any)?.claims?.email;
    if (!email) return res.status(401).json({ message: "Unauthorized" });
    const isAdmin = await storage.isAdmin(email);
    res.json({ isAdmin });
  });

  app.post("/api/admin/add-admin", requireAdmin, async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await storage.addAdmin(email);
    res.json({ success: true });
  });

  // ── AI Content Generation ──────────────────────────────────────────────────
  app.post("/api/admin/ai/generate", requireAdmin, async (req, res) => {
    try {
      const { prompt, type } = z.object({
        prompt: z.string().min(10),
        type: z.enum(["blog", "article"]).default("blog"),
      }).parse(req.body);

      const openaiKey = await storage.getSetting("openai_key");
      if (!openaiKey) return res.status(400).json({ message: "OpenAI API key not configured. Set it in Admin → SEO & Settings → AI Key." });

      const systemPrompt = `You are an expert content writer for IndiaCorpDB, a directory of Indian companies. Write high-quality, SEO-friendly ${type} content for Indian entrepreneurs, business owners, and professionals. Return JSON with fields: title, slug, content (markdown), excerpt (1-2 sentences), metaTitle, metaDescription, metaKeywords (comma separated), category.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(502).json({ message: `OpenAI error: ${(err as any).error?.message || "Unknown error"}` });
      }

      const data: any = await response.json();
      const generated = JSON.parse(data.choices[0].message.content);
      res.json(generated);
    } catch (err: any) {
      console.error("AI generate error:", err);
      res.status(500).json({ message: err.message || "AI generation failed" });
    }
  });

  // ── Sitemap ────────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      const now = new Date().toISOString().split("T")[0];

      const [allPosts, allArticles, { data: topCompanies }] = await Promise.all([
        storage.getPosts(),
        storage.getArticles(),
        storage.getCompanies(1, 1000),
      ]);

      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/blog", priority: "0.8", changefreq: "weekly" },
        { loc: "/articles", priority: "0.8", changefreq: "weekly" },
        { loc: "/faq", priority: "0.6", changefreq: "monthly" },
        { loc: "/about", priority: "0.5", changefreq: "monthly" },
      ];

      const urlEntries = [
        ...staticPages.map(p => `<url><loc>${baseUrl}${p.loc}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`),
        ...topCompanies.map((c: any) => {
          // Prefer slug-based country-aware URL; fall back to legacy ID URL
          const loc = c.slug && c.countryCode
            ? `${baseUrl}/${c.countryCode.toLowerCase()}/company/${c.slug}`
            : `${baseUrl}/company/${c.id}`;
          return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
        }),
        ...allPosts.filter((p: any) => p.published).map((p: any) => `<url><loc>${baseUrl}/blog/${p.slug}</loc><lastmod>${(p.updatedAt || p.createdAt || now).toString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
        ...allArticles.filter((a: any) => a.published).map((a: any) => `<url><loc>${baseUrl}/articles/${a.slug}</loc><lastmod>${(a.updatedAt || a.createdAt || now).toString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`;
      res.header("Content-Type", "application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/robots.txt", async (req, res) => {
    const custom = await storage.getSetting("robots_txt");
    const baseUrl = `https://${req.headers.host}`;
    const content = custom || `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl}/sitemap.xml`;
    res.header("Content-Type", "text/plain").send(content);
  });

  // ── Seed Data ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const [{ count: companyCount }] = await db.select({ count: count() }).from(companies);
    if (companyCount === 0) {
      await storage.bulkCreateCompanies([
        { cin: "L17110MH1973PLC019786", name: "Reliance Industries Limited", status: "Active", class: "Public", category: "Company limited by shares", subCategory: "Non-govt company", authorizedCapital: 15000000000, paidUpCapital: 6765000000, state: "Maharashtra", city: "Mumbai", email: "investor.relations@ril.com", phone: "+91-22-35555000", address: "3rd Floor, Maker Chambers IV, 222, Nariman Point, Mumbai, Maharashtra, 400021", incorporationDate: "1973-05-08", lastAgmDate: "2023-08-28", lastBalanceSheetDate: "2023-03-31" },
        { cin: "L65990MH1945PLC004558", name: "Tata Motors Limited", status: "Active", class: "Public", category: "Company limited by shares", subCategory: "Non-govt company", authorizedCapital: 4000000000, paidUpCapital: 765000000, state: "Maharashtra", city: "Mumbai", email: "inv_rel@tatamotors.com", phone: "+91-22-66658282", address: "Bombay House, 24 Homi Mody Street, Mumbai, Maharashtra, 400001", incorporationDate: "1945-09-01", lastAgmDate: "2023-07-05", lastBalanceSheetDate: "2023-03-31" },
        { cin: "L72200KA1996PLC019635", name: "Infosys Limited", status: "Active", class: "Public", category: "Company limited by shares", subCategory: "Non-govt company", authorizedCapital: 2400000000, paidUpCapital: 2074000000, state: "Karnataka", city: "Bengaluru", email: "investors@infosys.com", phone: "+91-80-28520261", address: "Electronics City, Hosur Road, Bengaluru, Karnataka, 560100", incorporationDate: "1981-07-02", lastAgmDate: "2023-06-28", lastBalanceSheetDate: "2023-03-31" },
      ]);
      await storage.createFaq({ question: "How do I search for a company?", answer: "Use the search bar on the homepage or click an alphabet to filter by name.", category: "General", order: 1 });
      await storage.createPost({ title: "Welcome to IndiaCorpDB", slug: "welcome", content: "We are excited to launch our new company directory service for India.", excerpt: "Launch of IndiaCorpDB.", published: true });
    }
  }

  // Seed admin email on every startup
  await storage.addAdmin("ashubhardwaj2018@gmail.com");

  return httpServer;
}
