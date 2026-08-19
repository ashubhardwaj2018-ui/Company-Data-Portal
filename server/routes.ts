import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, getSession } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  insertCompanySchema,
  insertServiceSchema,
  insertPostSchema,
  insertFaqSchema,
  insertLlpSchema,
  insertIfscSchema,
} from "@shared/schema";
import {
  parseLlpFile,
  parseIfscFile,
  MAX_IMPORT_FILE_BYTES,
} from "./datasetImport";
import {
  insertArticleSchema,
  insertAiTopicSchema,
  companies,
} from "@shared/schema";
import { generateAIContent } from "./aiWriter";
import { db } from "./db";
import { count } from "drizzle-orm";
import { processImportJob } from "./importProcessor";
import { limits } from "./rateLimit";

// Disk storage — avoids OOM for large files, writes to OS temp dir
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    // SECURITY: never use untrusted originalname in the path — random server-side name only
    filename: (_req, _file, cb) =>
      cb(
        null,
        `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB max
});


const ADMIN_COOKIE = "addressbay_admin";
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  // Fail closed: without a real secret an attacker could forge admin cookies.
  throw new Error(
    "SESSION_SECRET must be set in production (used to sign admin cookies and sessions)",
  );
}
const ADMIN_COOKIE_SECRET =
  process.env.SESSION_SECRET || "addressbay-dev-only-secret";
const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Signature covers payload + current password hash, so a password change or
// ADMIN_INIT_FORCE reset immediately invalidates every outstanding token.
function signAdminPayload(payload: string, passwordHash: string | null) {
  return createHmac("sha256", ADMIN_COOKIE_SECRET)
    .update(`${payload}.${passwordHash ?? ""}`)
    .digest("base64url");
}

function createAdminToken(email: string, passwordHash: string | null) {
  const payload = Buffer.from(
    JSON.stringify({ e: email, exp: Date.now() + ADMIN_TOKEN_TTL_MS }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signAdminPayload(payload, passwordHash)}`;
}

/** Verifies the admin cookie: signature (constant-time), expiry, and binding
 *  to the account's current password hash. Returns the email or null. */
async function verifyAdminToken(req: any): Promise<string | null> {
  const header = req.headers?.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (!match) return null;

  const value = decodeURIComponent(match[1]);
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  let email: string;
  let exp: number;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    email = decoded.e;
    exp = decoded.exp;
    if (typeof email !== "string" || typeof exp !== "number") return null;
  } catch {
    return null;
  }

  const passwordHash = await storage.getAdminPasswordHash(email);
  const expected = signAdminPayload(payload, passwordHash);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  if (Date.now() > exp) return null;

  return email;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Authentication
  app.set("trust proxy", 1);

  if (process.env.REPL_ID) {
    await setupAuth(app);
    registerAuthRoutes(app);
  } else {
    app.use(getSession());
  }

  // ── Middleware ─────────────────────────────────────────────────────────────
  // requireAdmin: accepts (a) local admin session or (b) Replit OAuth session
  const getAdminEmail = async (req: any): Promise<string | undefined> =>
    (await verifyAdminToken(req)) ??
    (req.user as any)?.claims?.email;

  const requireAdmin = async (req: any, res: any, next: any) => {
    const email = await getAdminEmail(req);

    if (!email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const adminOk = await storage.isAdmin(email);

    if (!adminOk) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };

  // ── Companies ──────────────────────────────────────────────────────────────
  app.get(api.companies.list.path, limits.list, async (req, res) => {
    try {
      const input = api.companies.list.input.parse(req.query);
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      const { data, total } = await storage.getCompanies(
        input.page,
        input.limit,
        input.search,
        input.alphabet,
        input.country,
        input.countryCode,
        input.state,
        input.status,
        input.city,
        input.industry,
        input.pincode,
        input.minCapital,
        input.maxCapital,
        input.incorporatedAfter,
        input.incorporatedBefore,
        input.sortBy,
      );
      res.json({ data, total, page: input.page, limit: input.limit });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Static /api/companies/* paths — ALL must come before /:id ─────────────

  // Autocomplete suggestions
  app.get("/api/companies/suggest", limits.search, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const countryCode = req.query.countryCode
        ? String(req.query.countryCode)
        : undefined;
      if (q.length < 2) return res.json([]);
      const results = await storage.searchSuggestions(q, countryCode, 8);
      res.json(results);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Phase 10: CSV export
  app.get("/api/companies/export", limits.export, async (req, res) => {
    try {
      const input = api.companies.list.input.parse({
        ...req.query,
        page: 1,
        limit: 10000,
      });
      const { data } = await storage.getCompanies(
        1,
        10000,
        input.search,
        input.alphabet,
        input.country,
        input.countryCode,
        input.state,
        input.status,
        input.city,
      );
      const headers = [
        "id",
        "name",
        "cin",
        "status",
        "state",
        "city",
        "country",
        "email",
        "phone",
        "address",
        "incorporationDate",
        "authorizedCapital",
        "paidUpCapital",
      ];
      const escape = (v: unknown) => {
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const rows = [
        headers.join(","),
        ...data.map((c) => headers.map((h) => escape((c as any)[h])).join(",")),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="companies-${Date.now()}.csv"`,
      );
      res.send(rows.join("\r\n"));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Phase 8: Trending companies
  app.get("/api/companies/trending", async (req, res) => {
    try {
      const countryCode = req.query.countryCode
        ? String(req.query.countryCode)
        : undefined;
      const limit = Math.min(Number(req.query.limit || 6), 12);
      const results = await storage.getTrendingCompanies(limit, countryCode);
      res.json(results);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 15: Company comparison — MUST be before /:id ───────────────────
  app.get("/api/companies/compare", async (req, res) => {
    try {
      const ids = String(req.query.ids || "")
        .split(",")
        .map(Number)
        .filter(Boolean)
        .slice(0, 3);
      if (!ids.length) return res.json([]);
      res.json(await storage.getCompaniesByIds(ids));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 21: Recent activity — MUST be before /:id ───────────────────────
  app.get("/api/companies/recent", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 6), 12);
      const cc = req.query.countryCode
        ? String(req.query.countryCode)
        : undefined;
      res.json(await storage.getRecentlyUpdated(limit, cc));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // GET /api/companies/:id  — must stay AFTER all /api/companies/<name> paths
  app.get(api.companies.get.path, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  });

  // ── Country-aware slug lookup (/api/:countryCode/company/:slug) ────────────
  app.get("/api/:countryCode/company/:slug", async (req, res) => {
    try {
      const { countryCode, slug } = req.params;
      const allowed = ["in", "au", "gb", "sg", "us"];
      if (!allowed.includes(countryCode.toLowerCase()))
        return res.status(400).json({ message: "Unsupported country code" });
      const company = await storage.getCompanyBySlug(countryCode, slug);
      if (!company)
        return res.status(404).json({ message: "Company not found" });

      // Phase 8: increment view count (fire-and-forget, debounced by IP+id in 30 min)
      const ip = String(req.ip || req.socket.remoteAddress || "unknown");
      const dedupeKey = `view:${ip}:${company.id}`;
      const { cache: serverCache, TTL: serverTTL } = await import("./cache");
      if (!serverCache.get(dedupeKey)) {
        serverCache.set(dedupeKey, 1, serverTTL.VIEW_DEBOUNCE);
        storage.incrementViewCount(company.id).catch(() => {});
      }

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
      if (!company)
        return res.status(404).json({ message: "Company not found" });
      const related = await storage.getRelatedCompanies(
        id,
        company.countryCode || "IN",
        company.state,
        company.roc,
        6,
      );
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
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.companies.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.companies.update.input.parse(req.body);
      const company = await storage.updateCompany(Number(req.params.id), input);
      if (!company)
        return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.companies.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteCompany(Number(req.params.id));
    res.status(204).send();
  });

  // ── File Upload → creates background import job ────────────────────────────
  app.post(
    api.companies.upload.path,
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const filePath = (req.file as any).path as string;
      const origName = ((req.file as any).originalname as string) || "";
      const fileSize = ((req.file as any).size as number) || 0;
      const createdBy = (await getAdminEmail(req)) || "unknown";
      const ext = origName.toLowerCase().split(".").pop() || "unknown";
      const allowedExt = ["xml", "xlsx", "xls", "csv"];
      if (!allowedExt.includes(ext)) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message: `Unsupported file type: .${ext}. Allowed: ${allowedExt.join(", ")}`,
          });
      }

      const SUPPORTED_UPLOAD_COUNTRIES = ["IN", "AU", "GB", "SG", "US"];
      const rawCountry = (req.body as any)?.countryCode;
      const countryCode = rawCountry ? String(rawCountry).toUpperCase() : "IN"; // omitted → default IN
      if (!SUPPORTED_UPLOAD_COUNTRIES.includes(countryCode)) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message: `Unsupported country code: ${countryCode}. Allowed: ${SUPPORTED_UPLOAD_COUNTRIES.join(", ")}`,
          });
      }

      try {
        const job = await storage.createImportJob({
          countryCode,
          datasetType: ext,
          filename: origName,
          fileSize,
          status: "QUEUED",
          createdBy,
        });

        // Respond immediately — browser can now close safely
        res.json({
          jobId: job.id,
          message: "Import queued. Track progress via jobId.",
        });

        // Fire-and-forget background processing
        setImmediate(() => {
          processImportJob(job.id, filePath, origName, countryCode).catch(
            (err) => {
              console.error(`[import:${job.id}] Unhandled error:`, err);
            },
          );
        });
      } catch (e: any) {
        fs.unlink(filePath, () => {});
        res.status(500).json({ message: "Failed to queue import job." });
      }
    },
  );

  // ── Import Job status endpoints ─────────────────────────────────────────────
  // ── Directory stats ───────────────────────────────────────────────────────
  app.get("/api/directory/stats", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
      const stats = await storage.getDirectoryStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/directory/stats/:countryCode", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
      const allowed = ["in", "au", "gb", "sg", "us"];
      const cc = req.params.countryCode.toLowerCase();
      if (!allowed.includes(cc))
        return res.status(400).json({ message: "Unsupported country code" });
      const stats = await storage.getDirectoryStats(cc);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/import-jobs", requireAdmin, async (_req, res) => {
    res.json(await storage.listImportJobs(50));
  });

  app.get("/api/admin/import-jobs/:id", requireAdmin, async (req, res) => {
    const job = await storage.getImportJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Import job not found" });
    res.json(job);
  });

  // ── Blog Posts ─────────────────────────────────────────────────────────────
  app.get(api.posts.list.path, async (req, res) =>
    res.json(await storage.getPosts()),
  );
  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ message: "Not found" });
    res.json(post);
  });
  app.post("/api/admin/posts", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createPost(insertPostSchema.parse(req.body)));
    } catch {
      res.status(400).json({ message: "Invalid post data" });
    }
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
  app.get("/api/articles", async (req, res) =>
    res.json(await storage.getArticles()),
  );
  app.get("/api/articles/:slug", async (req, res) => {
    const article = await storage.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ message: "Not found" });
    res.json(article);
  });
  app.post("/api/admin/articles", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createArticle(insertArticleSchema.parse(req.body)));
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid article data" });
    }
  });
  app.put("/api/admin/articles/:id", requireAdmin, async (req, res) => {
    const article = await storage.updateArticle(
      Number(req.params.id),
      req.body,
    );
    if (!article) return res.status(404).json({ message: "Not found" });
    res.json(article);
  });
  app.delete("/api/admin/articles/:id", requireAdmin, async (req, res) => {
    await storage.deleteArticle(Number(req.params.id));
    res.status(204).send();
  });

  // ── FAQs ───────────────────────────────────────────────────────────────────
  app.get(api.faqs.list.path, async (req, res) =>
    res.json(await storage.getFaqs()),
  );
  app.post("/api/admin/faqs", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createFaq(insertFaqSchema.parse(req.body)));
    } catch {
      res.status(400).json({ message: "Invalid FAQ data" });
    }
  });

  // Strict pagination parsing: finite positive integers only, bounded limit.
  const parsePagination = (
    q: Record<string, unknown>,
  ): { page: number; limit: number } | null => {
    const toInt = (v: unknown, dflt: number) => {
      if (v === undefined || v === "") return dflt;
      const n = Number(v);
      return Number.isSafeInteger(n) && n >= 1 ? n : null;
    };
    const page = toInt(q.page, 1);
    const limit = toInt(q.limit, 20);
    if (page === null || limit === null) return null;
    return { page: Math.min(page, 1_000_000), limit: Math.min(limit, 100) };
  };

  // ── Indian LLPs ─────────────────────────────────────────────────────────────
  app.get("/api/llps", async (req, res) => {
    const pg = parsePagination(req.query as Record<string, unknown>);
    if (!pg)
      return res.status(400).json({ message: "Invalid pagination parameters" });
    const { page, limit } = pg;
    const { search, state, status, alphabet } = req.query as Record<
      string,
      string | undefined
    >;
    if (alphabet && !/^[A-Za-z]$/.test(alphabet))
      return res.status(400).json({ message: "Alphabet must be one letter" });
    const { data, total } = await storage.getLlps(
      page,
      limit,
      search,
      state,
      status,
      alphabet?.toUpperCase(),
    );
    res.json({ data, total, page, limit });
  });
  app.get("/api/llps/stats", async (_req, res) => {
    try {
      res.json(await storage.getLlpStats());
    } catch (e: any) {
      console.error("[llp stats]", e.message);
      res.status(500).json({ message: "Failed to load LLP stats" });
    }
  });
  app.get("/api/llps/:id/related", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ message: "Invalid id" });
    try {
      const llp = await storage.getLlp(id);
      if (!llp) return res.status(404).json({ message: "LLP not found" });
      res.json(await storage.getRelatedLlps(id, llp.state, 6));
    } catch (e: any) {
      console.error("[related llps]", e.message);
      res.status(500).json({ message: "Failed to load related LLPs" });
    }
  });
  app.get("/api/llps/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ message: "Invalid id" });
    const llp = await storage.getLlp(id);
    if (!llp) return res.status(404).json({ message: "LLP not found" });
    res.json(llp);
  });
  app.post(
    "/api/admin/llps/import",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const filePath = (req.file as any).path as string;
      const ext =
        (((req.file as any).originalname as string) || "")
          .toLowerCase()
          .split(".")
          .pop() || "";
      if (!["csv", "xlsx", "xls"].includes(ext)) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message: `Unsupported file type: .${ext}. Allowed: csv, xlsx, xls`,
          });
      }
      if (((req.file as any).size as number) > MAX_IMPORT_FILE_BYTES) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message:
              "File too large — maximum import size is 25 MB. Split the file and retry.",
          });
      }
      try {
        const { rows, errors, totalRows } = parseLlpFile(filePath);
        if (!rows.length)
          return res
            .status(400)
            .json({
              message:
                "No valid LLP rows found in file. Ensure it has a name/LLP Name column.",
              errors,
              totalRows,
            });
        const { imported } = await storage.bulkUpsertLlps(rows);
        res.json({
          imported,
          skipped: totalRows - rows.length,
          totalRows,
          errors,
        });
      } catch (e: any) {
        console.error("[llp-import]", e);
        res
          .status(500)
          .json({
            message: "Import failed: " + (e.message || "unknown error"),
          });
      } finally {
        fs.unlink(filePath, () => {});
      }
    },
  );
  app.post("/api/admin/llps", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createLlp(insertLlpSchema.parse(req.body)));
    } catch {
      res.status(400).json({ message: "Invalid LLP data" });
    }
  });
  app.put("/api/admin/llps/:id", requireAdmin, async (req, res) => {
    try {
      const row = await storage.updateLlp(
        Number(req.params.id),
        insertLlpSchema.partial().parse(req.body),
      );
      if (!row) return res.status(404).json({ message: "LLP not found" });
      res.json(row);
    } catch {
      res.status(400).json({ message: "Invalid LLP data" });
    }
  });
  app.delete("/api/admin/llps/:id", requireAdmin, async (req, res) => {
    await storage.deleteLlp(Number(req.params.id));
    res.status(204).send();
  });

  // ── Bank IFSC codes ──────────────────────────────────────────────────────────
  app.get("/api/ifsc", async (req, res) => {
    const pg = parsePagination(req.query as Record<string, unknown>);
    if (!pg)
      return res.status(400).json({ message: "Invalid pagination parameters" });
    const { page, limit } = pg;
    const { search, bank, state } = req.query as Record<
      string,
      string | undefined
    >;
    const { data, total } = await storage.getIfscCodes(
      page,
      limit,
      search,
      bank,
      state,
    );
    res.json({ data, total, page, limit });
  });
  app.get("/api/ifsc/:code/related", async (req, res) => {
    try {
      const row = await storage.getIfscByCode(req.params.code);
      if (!row) return res.status(404).json({ message: "IFSC code not found" });
      res.json(
        await storage.getRelatedIfsc(row.ifsc, row.bank, row.district, 6),
      );
    } catch (e: any) {
      console.error("[related ifsc]", e.message);
      res.status(500).json({ message: "Failed to load related branches" });
    }
  });
  app.get("/api/ifsc/:code", async (req, res) => {
    const row = await storage.getIfscByCode(String(req.params.code));
    if (!row) return res.status(404).json({ message: "IFSC code not found" });
    res.json(row);
  });
  app.post(
    "/api/admin/ifsc/import",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const filePath = (req.file as any).path as string;
      const ext =
        (((req.file as any).originalname as string) || "")
          .toLowerCase()
          .split(".")
          .pop() || "";
      if (!["csv", "xlsx", "xls"].includes(ext)) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message: `Unsupported file type: .${ext}. Allowed: csv, xlsx, xls`,
          });
      }
      if (((req.file as any).size as number) > MAX_IMPORT_FILE_BYTES) {
        fs.unlink(filePath, () => {});
        return res
          .status(400)
          .json({
            message:
              "File too large — maximum import size is 25 MB. Split the file and retry.",
          });
      }
      try {
        const { rows, errors, totalRows } = parseIfscFile(filePath);
        if (!rows.length)
          return res
            .status(400)
            .json({
              message:
                "No valid IFSC rows found in file. Ensure it has BANK and IFSC columns.",
              errors,
              totalRows,
            });
        const { imported } = await storage.bulkUpsertIfsc(rows);
        res.json({
          imported,
          skipped: totalRows - rows.length,
          totalRows,
          errors,
        });
      } catch (e: any) {
        console.error("[ifsc-import]", e);
        res
          .status(500)
          .json({
            message: "Import failed: " + (e.message || "unknown error"),
          });
      } finally {
        fs.unlink(filePath, () => {});
      }
    },
  );
  app.post("/api/admin/ifsc", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createIfsc(insertIfscSchema.parse(req.body)));
    } catch {
      res.status(400).json({ message: "Invalid IFSC data" });
    }
  });
  app.put("/api/admin/ifsc/:id", requireAdmin, async (req, res) => {
    try {
      const row = await storage.updateIfsc(
        Number(req.params.id),
        insertIfscSchema.partial().parse(req.body),
      );
      if (!row)
        return res.status(404).json({ message: "IFSC record not found" });
      res.json(row);
    } catch {
      res.status(400).json({ message: "Invalid IFSC data" });
    }
  });
  app.delete("/api/admin/ifsc/:id", requireAdmin, async (req, res) => {
    await storage.deleteIfsc(Number(req.params.id));
    res.status(204).send();
  });

  // ── Services ───────────────────────────────────────────────────────────────
  app.get("/api/services", async (req, res) =>
    res.json(await storage.getServices()),
  );
  app.post("/api/admin/services", requireAdmin, async (req, res) => {
    try {
      res
        .status(201)
        .json(await storage.createService(insertServiceSchema.parse(req.body)));
    } catch {
      res.status(400).json({ message: "Invalid service data" });
    }
  });
  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.status(204).send();
  });

  // Upload a service asset (image / PDF / doc) — returns a served URL that can
  // be used as the service link instead of an external URL.
  app.post(
    "/api/admin/services/upload",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const tmpPath = (req.file as any).path as string;
      const origName = ((req.file as any).originalname as string) || "file";
      const fileSize = ((req.file as any).size as number) || 0;
      const ext = origName.toLowerCase().split(".").pop() || "";
      // SVG excluded: same-origin stored active content risk
      const allowedExt = [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "csv",
        "txt",
        "zip",
      ];
      if (!allowedExt.includes(ext)) {
        fs.unlink(tmpPath, () => {});
        return res
          .status(400)
          .json({ message: `Unsupported file type: .${ext}` });
      }
      if (fileSize > 20 * 1024 * 1024) {
        fs.unlink(tmpPath, () => {});
        return res.status(400).json({ message: "File too large (max 20 MB)" });
      }
      try {
        const uploadsDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "services",
        );
        fs.mkdirSync(uploadsDir, { recursive: true });
        const safeName = origName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${Date.now()}_${safeName}`;
        fs.copyFileSync(tmpPath, path.join(uploadsDir, fileName));
        fs.unlink(tmpPath, () => {});
        res.json({ url: `/uploads/services/${fileName}` });
      } catch (e) {
        fs.unlink(tmpPath, () => {});
        res.status(500).json({ message: "Failed to store file" });
      }
    },
  );

  // ── Site Settings (SEO) ────────────────────────────────────────────────────
  app.get("/api/settings", async (req, res) => {
    const keys = [
      "site_title",
      "site_description",
      "site_keywords",
      "og_image",
      "robots_txt",
      "site_name",
      "contact_email",
      "support_phone",
      "footer_text",
      "announcement",
      "maintenance_mode",
      "social_twitter",
      "social_linkedin",
      "social_facebook",
      "auto_blog_enabled",
      "auto_blog_frequency",
      "auto_blog_last_run",
    ];
    const settings = await storage.getSettings(keys);
    // SECURITY: never expose the stored API key publicly — only whether it is set
    const openaiKey =
      process.env.OPENAI_API_KEY || (await storage.getSetting("openai_key"));
    res.json({ ...settings, openai_key_set: openaiKey ? "true" : "" });
  });
  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = z
        .object({ key: z.string(), value: z.string() })
        .parse(req.body);
      await storage.setSetting(key, value);
      res.json({ success: true });
    } catch {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });
  app.post("/api/admin/settings/bulk", requireAdmin, async (req, res) => {
    try {
      const data = z.record(z.string()).parse(req.body);
      for (const [key, value] of Object.entries(data))
        await storage.setSetting(key, value);
      res.json({ success: true });
    } catch {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // ── Local admin auth status ────────────────────────────────────────────────
  app.get("/api/admin/auth/me", async (req, res) => {
    try {
      const email = await verifyAdminToken(req);

      if (!email) {
        return res.status(401).json({
          isAdmin: false,
          authenticated: false,
        });
      }

      const isAdmin = await storage.isAdmin(email);

      if (!isAdmin) {
        res.clearCookie(ADMIN_COOKIE, { path: "/" });

        return res.status(403).json({
          isAdmin: false,
          authenticated: false,
        });
      }

      return res.json({
        isAdmin: true,
        authenticated: true,
        email,
      });
    } catch (error) {
      console.error("[admin/auth/me]", error);

      return res.status(500).json({
        isAdmin: false,
        authenticated: false,
      });
    }
  });

  // ── Local admin login / logout ─────────────────────────────────────────────
  const adminLoginHandler = async (req: any, res: any) => {
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(req.body);

    const adminOk = await storage.isAdmin(email);
    if (!adminOk)
      return res.status(401).json({ message: "Invalid credentials" });

    const hash = await storage.getAdminPasswordHash(email);
    if (!hash)
      return res
        .status(401)
        .json({ message: "Password login not configured for this account" });

    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = createAdminToken(email, hash);

    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.json({ success: true, email });
  };
  app.post("/api/admin/login", adminLoginHandler);
  app.post("/api/admin/auth/login", adminLoginHandler);

  const adminLogoutHandler = async (_req: any, res: any) => {
    res.clearCookie(ADMIN_COOKIE, { path: "/" });
    res.json({ success: true });
  };
  app.post("/api/admin/logout-local", adminLogoutHandler);
  app.post("/api/admin/auth/logout", adminLogoutHandler);

  // ── Admin change password ──────────────────────────────────────────────────
  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = z
        .object({
          currentPassword: z.string().min(1),
          newPassword: z
            .string()
            .min(8, "New password must be at least 8 characters"),
        })
        .parse(req.body);

      const email = await getAdminEmail(req);
      if (!email) return res.status(401).json({ message: "Unauthorized" });

      const hash = await storage.getAdminPasswordHash(email);
      if (hash) {
        const match = await bcrypt.compare(currentPassword, hash);
        if (!match)
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await storage.setAdminPassword(email, newHash);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Admin Management ───────────────────────────────────────────────────────
  app.get(api.admin.check.path, async (req, res) => {
    const email = await getAdminEmail(req);
    if (!email) return res.json({ isAdmin: false });
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
      const { prompt, type } = z
        .object({
          prompt: z.string().min(10),
          type: z.enum(["blog", "article"]).default("blog"),
        })
        .parse(req.body);

      const generated = await generateAIContent(prompt, type);
      res.json(generated);
    } catch (err: any) {
      console.error("AI generate error:", err);
      res.status(500).json({ message: err.message || "AI generation failed" });
    }
  });

  // ── AI Auto-Blog Scheduler ───────────────────────────────────────────────
  app.get("/api/admin/ai/topics", requireAdmin, async (_req, res) =>
    res.json(await storage.getAiTopics()),
  );
  app.post("/api/admin/ai/topics", requireAdmin, async (req, res) => {
    try {
      const parsed = insertAiTopicSchema.parse(req.body);
      if (parsed.topic.trim().length < 10)
        return res
          .status(400)
          .json({ message: "Topic must be at least 10 characters" });
      res.status(201).json(await storage.createAiTopic(parsed));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });
  app.delete("/api/admin/ai/topics/:id", requireAdmin, async (req, res) => {
    await storage.deleteAiTopic(Number(req.params.id));
    res.status(204).end();
  });
  app.post("/api/admin/ai/topics/:id/retry", requireAdmin, async (req, res) => {
    const t = await storage.updateAiTopic(Number(req.params.id), {
      status: "pending",
      errorMessage: null,
    });
    if (!t) return res.status(404).json({ message: "Topic not found" });
    res.json(t);
  });

  // ── Phase 15: Company comparison (already registered early, stub removed) ──

  // ── Phase 16: Newsletter ───────────────────────────────────────────────────
  app.post("/api/newsletter/subscribe", limits.write, async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !String(email).includes("@"))
        return res.status(400).json({ message: "Valid email required" });
      const result = await storage.subscribeNewsletter(String(email), name);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      await storage.unsubscribeNewsletter(String(email));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/newsletter", requireAdmin, async (req, res) => {
    try {
      res.json(await storage.listSubscribers());
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/newsletter/export", requireAdmin, async (req, res) => {
    try {
      const subs = await storage.listSubscribers();
      const csvEscape = (v: any) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const rows = [
        ["id", "email", "name", "source", "active", "subscribedAt"].join(","),
        ...subs.map((s) =>
          [
            s.id,
            s.email,
            s.name ?? "",
            s.source ?? "",
            s.active,
            s.subscribedAt ?? "",
          ]
            .map(csvEscape)
            .join(","),
        ),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="subscribers-${Date.now()}.csv"`,
      );
      res.send(rows.join("\n"));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 17: User profile helpers ────────────────────────────────────────
  app.get("/api/my/claims", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    res.json(await storage.listUserClaims(email));
  });

  app.get("/api/my/suggestions", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    res.json(await storage.listUserSuggestions(email));
  });

  // ── Phase 19: Reviews ──────────────────────────────────────────────────────
  // Static paths before /:id
  app.get("/api/companies/:id/reviews", async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      if (isNaN(companyId))
        return res.status(400).json({ message: "Invalid ID" });
      res.json(await storage.getCompanyReviews(companyId));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/companies/:id/reviews", limits.write, async (req, res) => {
    try {
      if (!req.isAuthenticated())
        return res
          .status(401)
          .json({ message: "Login required to leave a review" });
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company)
        return res.status(404).json({ message: "Company not found" });
      const email: string = (req.user as any)?.claims?.email || "";
      const { rating, comment, userName } = req.body;
      if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ message: "rating must be 1–5" });
      const review = await storage.createReview({
        companyId,
        userEmail: email,
        rating: Number(rating),
        comment,
        userName,
      });
      res.status(201).json(review);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      res.json(await storage.listReviews(status));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status))
        return res
          .status(400)
          .json({ message: "status must be approved or rejected" });
      const email: string = (req.user as any)?.claims?.email || "admin";
      await storage.updateReviewStatus(id, status, email);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 21: Recent activity (already registered early, stub removed) ────

  // ── Phase 26: Company Badges (admin) ──────────────────────────────────────
  app.patch(
    "/api/admin/companies/:id/badges",
    requireAdmin,
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        const { badges } = req.body;
        if (!Array.isArray(badges))
          return res.status(400).json({ message: "badges must be an array" });
        const allowed = ["verified", "featured", "claimed", "premium"];
        const safe = badges.filter((b: string) => allowed.includes(b));
        await storage.updateCompanyBadges(id, safe);
        res.json({ ok: true, badges: safe });
      } catch (e) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    },
  );

  // ── Phase 27: Saved Searches ───────────────────────────────────────────────
  app.get("/api/my/searches", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    res.json(await storage.getSavedSearches(email));
  });

  app.post("/api/my/searches", limits.write, async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    const { name, filters } = req.body;
    if (!name || !filters)
      return res.status(400).json({ message: "name and filters required" });
    const s = await storage.createSavedSearch(
      email,
      String(name),
      JSON.stringify(filters),
    );
    res.status(201).json(s);
  });

  app.delete("/api/my/searches/:id", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    await storage.deleteSavedSearch(Number(req.params.id), email);
    res.json({ ok: true });
  });

  // ── Phase 29: Admin User Management ───────────────────────────────────────
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.listAllUsers(200);
      res.json(users);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 31: Embeddable Widget (server-rendered HTML) ────────────────────
  app.get("/embed/company/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(Number(req.params.id));
      if (!company) return res.status(404).send("<h3>Company not found</h3>");
      // HTML-escape helper — prevents stored XSS from any company field
      const esc = (s: string | null | undefined) =>
        (s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      // Build a safe absolute URL using the request's actual protocol + host
      const proto =
        (req.headers["x-forwarded-proto"] as string | undefined)
          ?.split(",")[0]
          ?.trim() || "https";
      const host =
        (req.headers["x-forwarded-host"] as string | undefined) ||
        req.headers.host ||
        "addressbay.com";
      // Sanitise host: allow only hostname[:port] — no slashes/redirects
      const safeHost = host.replace(/[^a-zA-Z0-9.\-:]/g, "");
      const baseUrl = `${proto}://${safeHost}`;
      const profilePath =
        company.slug && company.countryCode
          ? `/${esc(company.countryCode.toLowerCase())}/company/${esc(company.slug)}`
          : `/company/${company.id}`;
      const url = `${baseUrl}${profilePath}`;
      const statusColor = company.status?.toLowerCase().includes("active")
        ? "#16a34a"
        : company.status?.toLowerCase().includes("strike")
          ? "#dc2626"
          : "#64748b";
      const badges = (() => {
        try {
          return JSON.parse(company.badges || "[]") as string[];
        } catch {
          return [];
        }
      })();
      const location = [company.city, company.state]
        .filter(Boolean)
        .map(esc)
        .join(", ");
      const regId = esc(company.cin || company.registrationNumber || "");
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(company.name)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:0}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;max-width:400px;margin:12px auto;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.cin{font-family:monospace;font-size:11px;color:#64748b;background:#f1f5f9;padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px}
.name{font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:4px}
.status{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;color:#fff;margin-bottom:10px}
.meta{font-size:12px;color:#64748b;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.badges{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em}
.badge-verified{background:#dbeafe;color:#1d4ed8}.badge-featured{background:#fef9c3;color:#a16207}
.badge-claimed{background:#dcfce7;color:#15803d}.badge-premium{background:#f3e8ff;color:#7c3aed}
.link{display:block;margin-top:12px;text-align:center;font-size:12px;font-weight:600;color:#2563eb;text-decoration:none;padding:8px;border:1px solid #2563eb;border-radius:8px}
.link:hover{background:#eff6ff}.powered{text-align:center;font-size:10px;color:#94a3b8;margin-top:8px}
</style></head><body>
<div class="card">
  ${regId ? `<div class="cin">${regId}</div>` : ""}
  <div class="name">${esc(company.name)}</div>
  <div class="status" style="background:${statusColor}">${esc(company.status || "Unknown")}</div>
  ${badges.length ? `<div class="badges">${badges.map((b: string) => `<span class="badge badge-${esc(b)}">${esc(b)}</span>`).join("")}</div>` : ""}
  ${location ? `<div class="meta">📍 ${location}</div>` : ""}
  ${company.incorporationDate ? `<div class="meta">📅 Est. ${new Date(company.incorporationDate).getFullYear()}</div>` : ""}
  ${company.authorizedCapital ? `<div class="meta">💰 ₹${(company.authorizedCapital / 10000000).toFixed(1)}Cr authorized capital</div>` : ""}
  <a href="${url}" target="_blank" rel="noopener noreferrer" class="link">View Full Profile →</a>
  <div class="powered">Powered by AddressBay</div>
</div></body></html>`;
      res
        .setHeader("Content-Type", "text/html; charset=utf-8")
        .setHeader("X-Frame-Options", "ALLOWALL")
        .setHeader("X-Content-Type-Options", "nosniff")
        .send(html);
    } catch (e) {
      res.status(500).send("Error");
    }
  });

  // ── Phase 34: RSS Feeds ────────────────────────────────────────────────────
  app.get("/rss/recent.xml", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      const companies = await storage.getRecentlyUpdated(20);
      const items = companies
        .map((c) => {
          const url =
            c.slug && c.countryCode
              ? `${baseUrl}/${c.countryCode.toLowerCase()}/company/${c.slug}`
              : `${baseUrl}/company/${c.id}`;
          const desc = [c.status, c.city, c.state, c.country]
            .filter(Boolean)
            .join(" · ");
          return `<item><title>${c.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title><link>${url}</link><description>${desc}</description><pubDate>${new Date(c.updatedAt || c.createdAt || Date.now()).toUTCString()}</pubDate><guid>${url}</guid></item>`;
        })
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AddressBay — Recently Updated Companies</title><link>${baseUrl}</link><description>Recently updated company records on AddressBay</description><language>en-us</language>${items}</channel></rss>`;
      res.setHeader("Content-Type", "application/rss+xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating RSS");
    }
  });

  app.get("/rss/trending.xml", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      const companies = await storage.getTrendingCompanies(20);
      const items = companies
        .map((c) => {
          const url =
            c.slug && c.countryCode
              ? `${baseUrl}/${c.countryCode.toLowerCase()}/company/${c.slug}`
              : `${baseUrl}/company/${c.id}`;
          const desc = [c.status, c.city, c.state].filter(Boolean).join(" · ");
          return `<item><title>${c.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title><link>${url}</link><description>${desc} — ${c.viewCount || 0} views</description><pubDate>${new Date(c.updatedAt || c.createdAt || Date.now()).toUTCString()}</pubDate><guid>${url}</guid></item>`;
        })
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AddressBay — Trending Companies</title><link>${baseUrl}</link><description>Trending company profiles on AddressBay</description><language>en-us</language>${items}</channel></rss>`;
      res.setHeader("Content-Type", "application/rss+xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating RSS");
    }
  });

  // ── Phase 24: Bulk update ──────────────────────────────────────────────────
  app.patch("/api/admin/companies/bulk", requireAdmin, async (req, res) => {
    try {
      const { ids, fields } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res.status(400).json({ message: "ids[] required" });
      if (!fields || !Object.keys(fields).length)
        return res.status(400).json({ message: "fields required" });
      const allowed = [
        "status",
        "industry",
        "source",
        "class",
        "category",
        "subCategory",
        "state",
        "city",
        "district",
        "pincode",
        "email",
        "phone",
        "address",
        "roc",
        "country",
        "incorporationDate",
        "lastAgmDate",
        "lastBalanceSheetDate",
      ];
      const safeFields = Object.fromEntries(
        Object.entries(fields).filter(([k]) => allowed.includes(k)),
      );
      const updated = await storage.bulkUpdateCompanies(
        ids.map(Number),
        safeFields,
      );
      res.json({ updated });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 11: Watchlist ────────────────────────────────────────────────────
  app.get("/api/watchlist/check/:companyId", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ saved: false });
    const email: string = (req.user as any)?.claims?.email || "";
    const saved = await storage.isInWatchlist(
      email,
      Number(req.params.companyId),
    );
    res.json({ saved });
  });

  app.get("/api/watchlist", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const result = await storage.getUserWatchlist(email, page, limit);
    res.json(result);
  });

  app.post("/api/watchlist/:companyId", limits.write, async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    const companyId = Number(req.params.companyId);
    const item = await storage.addToWatchlist(email, companyId);
    res.status(201).json(item);
  });

  app.delete("/api/watchlist/:companyId", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Login required" });
    const email: string = (req.user as any)?.claims?.email || "";
    await storage.removeFromWatchlist(email, Number(req.params.companyId));
    res.json({ ok: true });
  });

  // ── Phase 14: Data Correction Suggestions ─────────────────────────────────
  app.post("/api/companies/:id/suggest", limits.write, async (req, res) => {
    try {
      if (!req.isAuthenticated())
        return res
          .status(401)
          .json({ message: "Login required to submit suggestions" });
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company)
        return res.status(404).json({ message: "Company not found" });
      const email: string = (req.user as any)?.claims?.email || "";
      const { fieldName, currentValue, suggestedValue, reason } = req.body;
      if (!fieldName || !suggestedValue)
        return res
          .status(400)
          .json({ message: "fieldName and suggestedValue are required" });
      const suggestion = await storage.createSuggestion({
        companyId,
        userEmail: email,
        fieldName,
        currentValue,
        suggestedValue,
        reason,
      });
      res.status(201).json(suggestion);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/suggestions", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      res.json(await storage.listSuggestions(status));
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/admin/suggestions/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["applied", "dismissed"].includes(status))
        return res
          .status(400)
          .json({ message: "status must be applied or dismissed" });
      const email: string = (await getAdminEmail(req)) || "admin";
      const result = await storage.updateSuggestionStatus(id, status, email);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Phase 7: Company Claims ────────────────────────────────────────────────
  // Any authenticated user can submit a claim; admin reviews it.
  app.post("/api/companies/:id/claim", async (req, res) => {
    try {
      if (!req.isAuthenticated())
        return res
          .status(401)
          .json({ message: "Login required to claim a listing" });
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company)
        return res.status(404).json({ message: "Company not found" });
      const email: string = (req.user as any)?.claims?.email || "";
      const { userName, phone, message } = req.body;
      const claim = await storage.createClaim({
        companyId,
        userEmail: email,
        userName,
        phone,
        message,
      });
      res.status(201).json(claim);
    } catch (e: any) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/admin/claims", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      const claims = await storage.listClaims(status);
      res.json(claims);
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/admin/claims/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status))
        return res
          .status(400)
          .json({ message: "status must be approved or rejected" });
      const email: string = (await getAdminEmail(req)) || "admin";
      await storage.updateClaimStatus(id, status, email);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ── Sitemap ────────────────────────────────────────────────────────────────
  const SITEMAP_CHUNK = 49950; // URLs per sitemap file (protocol limit is 50,000)
  // XML-escape a string for safe inclusion in <loc>/text nodes
  const xmlEsc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  // Encode a single database-derived URL path segment
  const urlSeg = (s: string) => encodeURIComponent(s);
  const SITEMAP_COUNTRY_LABELS: Record<string, string> = {
    in: "Indian Companies",
    au: "Australian Companies",
    gb: "UK Companies",
    sg: "Singapore Companies",
    us: "US Businesses",
  };

  async function buildSitemapCatalog(baseUrl: string) {
    const stats = await storage.getSitemapStats();
    const chunksOf = (n: number) => Math.max(1, Math.ceil(n / SITEMAP_CHUNK));
    const categories: {
      key: string;
      label: string;
      count: number;
      files: string[];
    }[] = [];

    categories.push({
      key: "pages",
      label: "Static Pages, Blog & Articles",
      count: 0,
      files: [`${baseUrl}/sitemaps/pages.xml`],
    });
    for (const c of stats.companies) {
      const cc = c.countryCode;
      const files = Array.from(
        { length: chunksOf(c.count) },
        (_, i) => `${baseUrl}/sitemaps/companies-${cc}-${i + 1}.xml`,
      );
      categories.push({
        key: `companies-${cc}`,
        label: SITEMAP_COUNTRY_LABELS[cc] || `${cc.toUpperCase()} Companies`,
        count: c.count,
        files,
      });
    }
    if (stats.llps > 0)
      categories.push({
        key: "llps",
        label: "Indian LLPs",
        count: stats.llps,
        files: Array.from(
          { length: chunksOf(stats.llps) },
          (_, i) => `${baseUrl}/sitemaps/llps-${i + 1}.xml`,
        ),
      });
    if (stats.ifsc > 0)
      categories.push({
        key: "ifsc",
        label: "Bank IFSC Codes",
        count: stats.ifsc,
        files: Array.from(
          { length: chunksOf(stats.ifsc) },
          (_, i) => `${baseUrl}/sitemaps/ifsc-${i + 1}.xml`,
        ),
      });
    return categories;
  }

  // Master sitemap index — always up to date with the database
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      const now = new Date().toISOString().split("T")[0];
      const categories = await buildSitemapCatalog(baseUrl);
      const entries = categories
        .flatMap((c) => c.files)
        .map(
          (loc) =>
            `<sitemap><loc>${loc}</loc><lastmod>${now}</lastmod></sitemap>`,
        );
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>`;
      res.header("Content-Type", "application/xml").send(xml);
    } catch (e) {
      console.error("[sitemap index]", e);
      res.status(500).send("Error generating sitemap index");
    }
  });

  // Admin SEO diagnostic report — cached to avoid full-table scans on every load
  let seoReportCache: { data: any; at: number } | null = null;
  const SEO_REPORT_TTL_MS = 10 * 60 * 1000;
  app.get("/api/admin/seo-report", requireAdmin, async (req, res) => {
    try {
      const force = req.query.refresh === "1";
      if (
        !force &&
        seoReportCache &&
        Date.now() - seoReportCache.at < SEO_REPORT_TTL_MS
      ) {
        return res.json({ ...seoReportCache.data, cached: true });
      }
      const data = await storage.getSeoReport();
      seoReportCache = { data, at: Date.now() };
      res.json({ ...data, cached: false });
    } catch (e) {
      console.error("[seo-report]", e);
      res.status(500).json({ message: "Failed to build SEO report" });
    }
  });

  // JSON API describing all sitemap files (used by the admin Sitemap tab)
  app.get("/api/sitemap", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      res.json({
        sitemapIndex: `${baseUrl}/sitemap.xml`,
        urlsPerFile: SITEMAP_CHUNK,
        categories: await buildSitemapCatalog(baseUrl),
      });
    } catch (e) {
      console.error("[sitemap api]", e);
      res.status(500).json({ message: "Failed to build sitemap catalog" });
    }
  });

  // Category sitemap files: pages.xml, companies-<cc>-<n>.xml, llps-<n>.xml, ifsc-<n>.xml
  app.get("/sitemaps/:file", async (req, res) => {
    try {
      const baseUrl = `https://${req.headers.host}`;
      const now = new Date().toISOString().split("T")[0];
      const file = req.params.file;
      const wrap = (urls: string[]) =>
        res
          .header("Content-Type", "application/xml")
          .send(
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`,
          );

      let m: RegExpMatchArray | null;
      if ((m = file.match(/^companies-([a-z]{2})-(\d+)\.xml$/))) {
        const [, cc, pageStr] = m;
        const page = Number(pageStr);
        if (page < 1 || page > 10000) return res.status(404).send("Not found");
        const rows = await storage.getCompanySitemapRows(
          cc,
          (page - 1) * SITEMAP_CHUNK,
          SITEMAP_CHUNK,
        );
        return wrap(
          rows.map((c) => {
            const loc =
              c.slug && c.countryCode
                ? `${baseUrl}/${urlSeg(c.countryCode.toLowerCase())}/company/${urlSeg(c.slug)}`
                : `${baseUrl}/company/${c.id}`;
            const lastmod = c.updatedAt
              ? new Date(c.updatedAt).toISOString().split("T")[0]
              : now;
            return `<url><loc>${xmlEsc(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
          }),
        );
      }
      if ((m = file.match(/^llps-(\d+)\.xml$/))) {
        const page = Number(m[1]);
        if (page < 1 || page > 10000) return res.status(404).send("Not found");
        const rows = await storage.getLlpSitemapRows(
          (page - 1) * SITEMAP_CHUNK,
          SITEMAP_CHUNK,
        );
        return wrap(
          rows.map((r) => {
            const lastmod = r.updatedAt
              ? new Date(r.updatedAt).toISOString().split("T")[0]
              : now;
            return `<url><loc>${baseUrl}/llps/${r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
          }),
        );
      }
      if ((m = file.match(/^ifsc-(\d+)\.xml$/))) {
        const page = Number(m[1]);
        if (page < 1 || page > 10000) return res.status(404).send("Not found");
        const rows = await storage.getIfscSitemapRows(
          (page - 1) * SITEMAP_CHUNK,
          SITEMAP_CHUNK,
        );
        return wrap(
          rows.map(
            (r) =>
              `<url><loc>${xmlEsc(`${baseUrl}/ifsc/${urlSeg(r.ifsc)}`)}</loc><lastmod>${now}</lastmod><changefreq>yearly</changefreq><priority>0.5</priority></url>`,
          ),
        );
      }
      if (file !== "pages.xml") return res.status(404).send("Not found");

      // pages.xml — static pages, country/state/city landing pages, blog & articles
      const SUPPORTED_COUNTRIES = ["in", "au", "gb", "sg"];

      const [allPosts, allArticles, { data: topCompanies }, globalStats] =
        await Promise.all([
          storage.getPosts(),
          storage.getArticles(),
          storage.getCompanies(1, 5000),
          storage.getDirectoryStats(),
        ]);

      const stateSlug = (s: string) =>
        s
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/blog", priority: "0.8", changefreq: "weekly" },
        { loc: "/articles", priority: "0.8", changefreq: "weekly" },
        { loc: "/faq", priority: "0.6", changefreq: "monthly" },
        { loc: "/about", priority: "0.5", changefreq: "monthly" },
      ];

      // Country landing pages
      const countryPages = SUPPORTED_COUNTRIES.map(
        (cc) =>
          `<url><loc>${baseUrl}/countries/${cc}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      );

      // State pages — derived from live directory stats
      const statePages = (globalStats.byState || [])
        .filter((s: any) => s.state && s.count > 0)
        .map((s: any) => {
          const cc = "in";
          return `<url><loc>${baseUrl}/countries/${cc}/${stateSlug(s.state)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
        });

      // City pages — derive from top companies (Phase 13)
      const cityMap = new Map<
        string,
        { state: string; city: string; cc: string }
      >();
      for (const c of topCompanies as any[]) {
        if (c.city && c.state && c.countryCode) {
          const key = `${c.countryCode}:${c.state}:${c.city}`;
          if (!cityMap.has(key))
            cityMap.set(key, {
              state: c.state,
              city: c.city,
              cc: c.countryCode.toLowerCase(),
            });
        }
      }
      const cityPages = Array.from(cityMap.values())
        .slice(0, 500)
        .map(({ state, city, cc }) => {
          const cityKey = stateSlug(city); // reuse slug helper
          return `<url><loc>${baseUrl}/countries/${cc}/${stateSlug(state)}/${cityKey}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
        });

      const urlEntries = [
        ...staticPages.map(
          (p) =>
            `<url><loc>${baseUrl}${p.loc}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
        ),
        `<url><loc>${baseUrl}/llps</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
        `<url><loc>${baseUrl}/ifsc</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
        ...countryPages,
        ...statePages,
        ...cityPages,
        ...allPosts
          .filter((p: any) => p.published)
          .map(
            (p: any) =>
              `<url><loc>${xmlEsc(`${baseUrl}/blog/${urlSeg(p.slug)}`)}</loc><lastmod>${(p.updatedAt || p.createdAt || now).toString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
          ),
        ...allArticles
          .filter((a: any) => a.published)
          .map(
            (a: any) =>
              `<url><loc>${xmlEsc(`${baseUrl}/articles/${urlSeg(a.slug)}`)}</loc><lastmod>${(a.updatedAt || a.createdAt || now).toString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
          ),
      ];

      return wrap(urlEntries);
    } catch (e) {
      console.error("[sitemap file]", e);
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/robots.txt", async (req, res) => {
    const custom = await storage.getSetting("robots_txt");
    const baseUrl = `https://${req.headers.host}`;
    const content =
      custom ||
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${baseUrl}/sitemap.xml`;
    res.header("Content-Type", "text/plain").send(content);
  });

  // ── Seed Data ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const [{ count: companyCount }] = await db
      .select({ count: count() })
      .from(companies);
    if (companyCount === 0) {
      await storage.bulkCreateCompanies([
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
          address:
            "3rd Floor, Maker Chambers IV, 222, Nariman Point, Mumbai, Maharashtra, 400021",
          incorporationDate: "1973-05-08",
          lastAgmDate: "2023-08-28",
          lastBalanceSheetDate: "2023-03-31",
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
          address:
            "Bombay House, 24 Homi Mody Street, Mumbai, Maharashtra, 400001",
          incorporationDate: "1945-09-01",
          lastAgmDate: "2023-07-05",
          lastBalanceSheetDate: "2023-03-31",
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
          incorporationDate: "1981-07-02",
          lastAgmDate: "2023-06-28",
          lastBalanceSheetDate: "2023-03-31",
        },
      ]);
      await storage.createFaq({
        question: "How do I search for a company?",
        answer:
          "Use the search bar on the homepage or click an alphabet to filter by name.",
        category: "General",
        order: 1,
      });
      await storage.createPost({
        title: "Welcome to IndiaCorpDB",
        slug: "welcome",
        content:
          "We are excited to launch our new company directory service for India.",
        excerpt: "Launch of IndiaCorpDB.",
        published: true,
      });
    }
  }

  // Seed admin email on every startup
  await storage.addAdmin("ashubhardwaj2018@gmail.com");

  return httpServer;
}
