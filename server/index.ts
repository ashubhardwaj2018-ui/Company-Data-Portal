import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Mark any import jobs that were PROCESSING when the server last died as FAILED
  const { storage } = await import("./storage");
  await storage.markStaleJobsFailed();

  // One-time admin password seed — runs on startup if env vars are present.
  // Safe to leave in: once password_hash is set, subsequent starts skip the update.
  const initEmail = process.env.ADMIN_INIT_EMAIL;
  const initPass  = process.env.ADMIN_INIT_PASS;
  if (initEmail && initPass) {
    try {
      const bcrypt = await import("bcryptjs");
      const existing = await storage.getAdminPasswordHash(initEmail);
      if (!existing) {
        const hash = await bcrypt.hash(initPass, 12);
        await storage.setAdminPassword(initEmail, hash);
        log(`Admin password seeded for ${initEmail}`, "startup");
      }
    } catch (e) {
      log(`Admin seed skipped: ${(e as Error).message}`, "startup");
    }
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    // Server-side SEO meta injection for key URL patterns (for crawlers)
    const { createSeoMiddleware } = await import("./seoMiddleware");
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    let cachedHtml = "";
    const getHtml = async () => {
      if (!cachedHtml) {
        cachedHtml = readFileSync(join(process.cwd(), "dist", "public", "index.html"), "utf-8");
      }
      return cachedHtml;
    };
    app.use(createSeoMiddleware(getHtml));
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
