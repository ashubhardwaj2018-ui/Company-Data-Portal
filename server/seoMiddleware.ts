/**
 * SEO middleware — injects dynamic meta tags into the served HTML for key
 * URL patterns so that crawlers (and social link previews) receive correct
 * Open Graph / Twitter Card tags without executing JavaScript.
 *
 * Works in both development (Vite dev server) and production (static build).
 * Must be registered BEFORE the Vite middleware / static serve handler.
 */
import { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", AU: "Australia", GB: "United Kingdom", SG: "Singapore",
};
const COUNTRY_REGISTRARS: Record<string, string> = {
  IN: "MCA", AU: "ASIC", GB: "Companies House", SG: "ACRA",
};

function stateFromSlug(slug: string) {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildMeta(opts: {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  structuredData?: object;
}): string {
  const { title, description, canonical, ogType = "website", structuredData } = opts;
  const escaped = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    `<title>${escaped(title)}</title>`,
    `<meta name="description" content="${escaped(description)}" />`,
    `<link rel="canonical" href="${escaped(canonical)}" />`,
    `<meta property="og:title" content="${escaped(title)}" />`,
    `<meta property="og:description" content="${escaped(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${escaped(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escaped(title)}" />`,
    `<meta name="twitter:description" content="${escaped(description)}" />`,
    structuredData
      ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
      : "",
  ].filter(Boolean).join("\n    ");
}

function injectIntoHtml(html: string, metaBlock: string): string {
  // Replace the placeholder <title> tag if present, otherwise inject before </head>
  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${metaBlock}\n  </head>`);
  }
  return html;
}

/**
 * Returns an Express middleware that intercepts known page-URL patterns,
 * fetches the relevant data, and injects OG / JSON-LD meta into the HTML.
 *
 * @param getHtml – async function that returns the current index.html string
 *                  (differs between dev/prod environments)
 */
export function createSeoMiddleware(getHtml: () => Promise<string>) {
  const ALLOWED_CC = new Set(["in", "au", "gb", "sg"]);

  return async function seoMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      // Only handle GET requests for page URLs (not /api/, not assets)
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.includes(".")) {
        return next();
      }

      const path = req.path.replace(/\/$/, "") || "/";
      const baseUrl = `https://${req.headers.host}`;

      // ── /in/company/:slug ─────────────────────────────────────────────────
      const slugMatch = path.match(/^\/([a-z]{2})\/company\/(.+)$/);
      if (slugMatch) {
        const [, cc, slug] = slugMatch;
        if (!ALLOWED_CC.has(cc)) return next();
        const company = await storage.getCompanyBySlug(cc, slug);
        if (!company) return next();

        const countryName = COUNTRY_NAMES[company.countryCode || "IN"] || "India";
        const regId = company.countryCode === "IN" ? company.cin : company.registrationNumber;
        const title = `${company.name} — ${regId ? regId + " | " : ""}Company Details | ${countryName} Directory`;
        const description = [
          `${company.name} is a ${company.status || "registered"} ${company.class || "company"}`,
          company.city ? `based in ${company.city}` : null,
          company.state ? `, ${company.state}` : null,
          `, ${countryName}.`,
          company.incorporationDate ? ` Incorporated ${new Date(company.incorporationDate).getFullYear()}.` : null,
          regId ? ` ${company.countryCode === "IN" ? "CIN" : "Reg No"}: ${regId}.` : null,
        ].filter(Boolean).join("");

        const structuredData = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.name,
          ...(company.email && { email: company.email }),
          ...(company.phone && { telephone: company.phone }),
          address: {
            "@type": "PostalAddress",
            addressLocality: company.city || undefined,
            addressRegion: company.state || undefined,
            addressCountry: company.countryCode || "IN",
            ...(company.pincode && { postalCode: company.pincode }),
          },
          ...(company.incorporationDate && {
            foundingDate: company.incorporationDate.toString().split("T")[0],
          }),
        };

        const html = await getHtml();
        const metaBlock = buildMeta({
          title,
          description,
          canonical: `${baseUrl}/${cc}/company/${slug}`,
          ogType: "profile",
          structuredData,
        });
        return res.setHeader("Content-Type", "text/html").send(injectIntoHtml(html, metaBlock));
      }

      // ── /countries/:cc/:state ─────────────────────────────────────────────
      const stateMatch = path.match(/^\/countries\/([a-z]{2})\/(.+)$/);
      if (stateMatch) {
        const [, cc, stateSlug] = stateMatch;
        if (!ALLOWED_CC.has(cc)) return next();
        const stateName = stateFromSlug(stateSlug);
        const countryName = COUNTRY_NAMES[cc.toUpperCase()] || cc.toUpperCase();
        const title = `${stateName} Companies — ${countryName} Business Directory`;
        const description = `Browse registered companies in ${stateName}, ${countryName}. Find contact details, registration numbers, and business information.`;
        const html = await getHtml();
        const metaBlock = buildMeta({
          title,
          description,
          canonical: `${baseUrl}/countries/${cc}/${stateSlug}`,
          structuredData: {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${stateName} Companies`,
            description,
          },
        });
        return res.setHeader("Content-Type", "text/html").send(injectIntoHtml(html, metaBlock));
      }

      // ── /countries/:cc ────────────────────────────────────────────────────
      const countryMatch = path.match(/^\/countries\/([a-z]{2})$/);
      if (countryMatch) {
        const [, cc] = countryMatch;
        if (!ALLOWED_CC.has(cc)) return next();
        const countryName = COUNTRY_NAMES[cc.toUpperCase()] || cc.toUpperCase();
        const registrar = COUNTRY_REGISTRARS[cc.toUpperCase()] || "official registrar";
        const title = `${countryName} Company Directory — Search Registered Businesses`;
        const description = `Search and browse all ${countryName} companies registered with ${registrar}. View CIN, registration details, address, and contact information.`;
        const html = await getHtml();
        const metaBlock = buildMeta({
          title,
          description,
          canonical: `${baseUrl}/countries/${cc}`,
          structuredData: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: `${baseUrl}/countries/${cc}`,
          },
        });
        return res.setHeader("Content-Type", "text/html").send(injectIntoHtml(html, metaBlock));
      }

      next();
    } catch (err) {
      // Never break page rendering due to SEO middleware failure
      next();
    }
  };
}
