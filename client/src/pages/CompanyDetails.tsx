import { useRoute, Link } from "wouter";
import type { Company } from "@shared/schema";
import { getCompanySeoStatus } from "@shared/seo";
import { Helmet } from "react-helmet-async";
import { useCompany, useCompanyBySlug, useRelatedCompanies } from "@/hooks/use-companies";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BadgesDisplay, parseBadges } from "@/components/companies/BadgesDisplay";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, MapPin, Calendar, FileText,
  Mail, IndianRupee, ArrowLeft, HelpCircle, Phone, ExternalLink, Eye, Scale, Printer,
  Hash, Globe, Clock, BookOpen, ChevronRight, Database, Landmark, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { buildCompanyIntro } from "@/lib/companyIntro";
import { DynamicServicesParagraph } from "@/components/companies/DynamicServicesParagraph";
import { ShareBar } from "@/components/layout/ShareBar";
import { ServiceAside } from "@/components/layout/ServiceAside";
import { ReviewsSection } from "@/components/companies/ReviewsSection";
import { SharePrintBar } from "@/components/companies/SharePrintBar";
import { InsightsWidget } from "@/components/companies/InsightsWidget";

// ── Country code → display name ───────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", AU: "Australia", GB: "United Kingdom", SG: "Singapore", US: "United States",
};

const COUNTRY_FLAGS: Record<string, string> = {
  IN: "🇮🇳", AU: "🇦🇺", GB: "🇬🇧", SG: "🇸🇬", US: "🇺🇸",
};
function canonicalUrl(company: Company): string {
  if (company.slug && company.countryCode) {
    return `/${company.countryCode.toLowerCase()}/company/${company.slug}`;
  }
  return `/company/${company.id}`;
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const cls = lower.includes("active")
    ? "ab-status-active"
    : lower.includes("strike") || lower.includes("dissolv") || lower.includes("wound")
    ? "ab-status-dissolved"
    : "ab-status-inactive";
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
        lower.includes("active") ? "bg-emerald-500" :
        lower.includes("strike") || lower.includes("dissolv") ? "bg-red-500" : "bg-slate-400"
      }`} />
      {status}
    </span>
  );
}
function CompanyFaqSection({ company }: { company: Company }) {
  const isIndia = company.countryCode === "IN";
  const countryName = COUNTRY_NAMES[company.countryCode || ""] || company.country || company.countryCode || "";
  return (
    <div className="ab-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Frequently Asked Questions</h2>
      </div>
      <div className="px-5 py-2">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="overview" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What type of company is {company.name}?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              {isIndia && <>
                <p><span className="text-slate-400 w-32 inline-block">Class</span> {company.class || "N/A"}</p>
                <p><span className="text-slate-400 w-32 inline-block">Category</span> {company.category || "N/A"}</p>
                <p><span className="text-slate-400 w-32 inline-block">Sub-Category</span> {company.subCategory || "N/A"}</p>
              </>}
              <p><span className="text-slate-400 w-32 inline-block">Status</span> {company.status || "N/A"}</p>
              {company.industry && <p><span className="text-slate-400 w-32 inline-block">Industry</span> {company.industry}</p>}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="registration" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">When was {company.name} incorporated?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              {isIndia
                ? <p><span className="text-slate-400 w-32 inline-block">CIN</span> {company.cin || "N/A"}</p>
                : <p><span className="text-slate-400 w-32 inline-block">Reg. Number</span> {company.registrationNumber || "N/A"}</p>}
              <p><span className="text-slate-400 w-32 inline-block">Incorporated</span> {safeLocaleDateString(company.incorporationDate, { year: "numeric", month: "long", day: "numeric" }) ?? "N/A"}</p>
              {isIndia && <p><span className="text-slate-400 w-32 inline-block">ROC</span> {company.roc || "N/A"}</p>}
            </AccordionContent>
          </AccordionItem>
          {isIndia && (
            <AccordionItem value="capital" className="border-slate-100">
              <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What is the capital structure of {company.name}?</AccordionTrigger>
              <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
                <p><span className="text-slate-400 w-36 inline-block">Authorised Capital</span> {safeNumber(company.authorizedCapital) !== undefined ? `₹ ${safeNumber(company.authorizedCapital)!.toLocaleString("en-IN")}` : "N/A"}</p>
                <p><span className="text-slate-400 w-36 inline-block">Paid-up Capital</span> {safeNumber(company.paidUpCapital) !== undefined ? `₹ ${safeNumber(company.paidUpCapital)!.toLocaleString("en-IN")}` : "N/A"}</p>
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="location" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">Where is {company.name} located?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              {company.address && <p><span className="text-slate-400 w-32 inline-block">Address</span> {company.address}</p>}
              {company.district && <p><span className="text-slate-400 w-32 inline-block">District</span> {company.district}</p>}
              <p><span className="text-slate-400 w-32 inline-block">City</span> {company.city || "N/A"}</p>
              <p><span className="text-slate-400 w-32 inline-block">State</span> {company.state || "N/A"}</p>
              <p><span className="text-slate-400 w-32 inline-block">Pincode</span> {company.pincode || "N/A"}</p>
              <p><span className="text-slate-400 w-32 inline-block">Country</span> {countryName}</p>
            </AccordionContent>
          </AccordionItem>
          {isIndia && (
            <AccordionItem value="compliance" className="border-slate-100 last:border-0">
              <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What is the compliance status of {company.name}?</AccordionTrigger>
              <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
                <p><span className="text-slate-400 w-40 inline-block">Last AGM Date</span> {safeLocaleDateString(company.lastAgmDate, { year: "numeric", month: "long", day: "numeric" }) ?? "N/A"}</p>
                <p><span className="text-slate-400 w-40 inline-block">Last Balance Sheet</span> {safeLocaleDateString(company.lastBalanceSheetDate, { year: "numeric", month: "long", day: "numeric" }) ?? "N/A"}</p>
              </AccordionContent>
            </AccordionItem>
          )}
          {company.customQna && (
            <AccordionItem value="custom" className="border-slate-100 last:border-0">
              <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">Additional Information about {company.name}</AccordionTrigger>
              <AccordionContent className="text-slate-600 text-sm whitespace-pre-wrap pb-4">
                {company.customQna}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}

// ── Related Companies ─────────────────────────────────────────────────────────
const SUGGESTION_FLAGS: Record<string, string> = { IN: "🇮🇳", AU: "🇦🇺", GB: "🇬🇧", SG: "🇸🇬", US: "🇺🇸" };

function RelatedCompanies({ company }: { company: Company }) {
  const { data: related = [] } = useRelatedCompanies(company.id);
  if (!related.length) return null;
  return (
    <div className="ab-card overflow-hidden" data-testid="section-suggested-companies">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/60">
        <Globe className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Suggested Companies
        </h2>
        <span className="ml-auto text-[11px] text-slate-400 normal-case tracking-normal">from all countries</span>
      </div>
      <div className="divide-y divide-slate-100">
        {related.map(c => {
          const cc = (c.countryCode || "IN").toUpperCase();
          return (
            <Link key={c.id} href={canonicalUrl(c)}
              className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors group"
              data-testid={`link-suggested-company-${c.id}`}>
              <div className="min-w-0 flex items-center gap-3">
                <span className="text-lg shrink-0" title={c.country || cc}>{SUGGESTION_FLAGS[cc] || "🌐"}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-800 group-hover:text-primary transition-colors truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {[c.city, c.state, c.country || cc].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {c.status && (
                  <StatusPill status={c.status} />
                )}
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
        {company.state && (
          <Link href={`/?state=${encodeURIComponent(company.state)}&countryCode=${company.countryCode || "IN"}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
              Companies in {company.state}
            </Badge>
          </Link>
        )}
        {company.city && (
          <Link href={`/?search=${encodeURIComponent(company.city)}&countryCode=${company.countryCode || "IN"}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
              Companies in {company.city}
            </Badge>
          </Link>
        )}
        {company.roc && (
          <Link href={`/?search=${encodeURIComponent(company.roc)}&countryCode=${company.countryCode || "IN"}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
              ROC: {company.roc}
            </Badge>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CompanyDetails() {
  const { user } = useAuth();
  const [matchById, paramsById] = useRoute("/company/:id");
  const [matchBySlug, paramsBySlug] = useRoute("/:countryCode/company/:slug");

  const numericId = matchById ? parseInt(paramsById?.id || "0") : 0;
  const byId = useCompany(numericId);

  const slugCountry = matchBySlug ? (paramsBySlug?.countryCode || "") : "";
  const slug = matchBySlug ? (paramsBySlug?.slug || "") : "";
  const bySlug = useCompanyBySlug(slugCountry, slug);

  const isLoading = matchById ? byId.isLoading : bySlug.isLoading;
  const isError   = matchById ? byId.isError   : bySlug.isError;
  const company   = matchById ? byId.data       : bySlug.data;

  if (isLoading) return <CompanyDetailsSkeleton />;
  if (isError || !company) return <CompanyNotFound />;

  const regId = company.countryCode === "IN" ? company.cin : company.registrationNumber;
  const regLabel = company.countryCode === "IN" ? "CIN" :
    company.countryCode === "AU" ? "ACN" :
    company.countryCode === "GB" ? "Company No." :
    company.countryCode === "SG" ? "UEN" : "Reg. No.";

  const pageCanonical = canonicalUrl(company);
  const countryName = COUNTRY_NAMES[company.countryCode || ""] || company.country || company.countryCode || "";
  const countryFlag = COUNTRY_FLAGS[company.countryCode || ""] || "🌐";
  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const canonicalFull = `${siteOrigin}${pageCanonical}`;
  const seoStatus = getCompanySeoStatus(company as any);

  const pageTitle = `${company.name}${regId ? ` — ${regLabel}: ${regId}` : ""} | ${countryName} Company Details`;
  const pageDesc = [
    `${company.name} is a ${company.status || "registered"} ${company.class?.toLowerCase() || "company"} in ${countryName}`,
    company.city ? ` based in ${company.city}` : "",
    company.state ? `, ${company.state}` : "",
    ". ",
    company.incorporationDate && safeYear(company.incorporationDate)
      ? `Incorporated ${safeYear(company.incorporationDate)}. `
      : "",
    regId ? `${regLabel}: ${regId}.` : "",
  ].join("").trim();

  const companyBadges = parseBadges(company.badges);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin + "/" },
      ...(company.countryCode ? [{ "@type": "ListItem", position: 2, name: countryName, item: `${siteOrigin}/countries/${company.countryCode.toLowerCase()}` }] : []),
      ...(company.state ? [{ "@type": "ListItem", position: 3, name: company.state, item: `${siteOrigin}/countries/${(company.countryCode || "in").toLowerCase()}/${encodeURIComponent(company.state)}` }] : []),
      { "@type": "ListItem", position: (company.state ? 4 : (company.countryCode ? 3 : 2)), name: company.name, item: canonicalFull },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: canonicalFull,
    ...(company.email && { email: company.email }),
    ...(company.phone && { telephone: company.phone }),
    address: {
      "@type": "PostalAddress",
      ...(company.address && { streetAddress: company.address }),
      ...(company.city && { addressLocality: company.city }),
      ...(company.state && { addressRegion: company.state }),
      ...(company.pincode && { postalCode: company.pincode }),
      addressCountry: company.countryCode || "IN",
    },
    ...(company.incorporationDate && {
      foundingDate: company.incorporationDate.toString().split("T")[0],
    }),
  };

  return (
    <div className="ab-details-page min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="robots" content={seoStatus.robots} />
        <link rel="canonical" href={canonicalFull} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalFull} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Helmet>
      <Navbar />

      {/* ── Company header ─────────────────────────────────────────────────── */}
      <div className="ab-hero text-white border-b border-indigo-900">
        <div className="container-width py-6">
          {/* Breadcrumb */}
            <div className="mb-5">
            <Breadcrumb company={company} countryName={countryName} />
          </div>

          {/* Name + meta row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              {/* Badges row */}
              {companyBadges.length > 0 && (
                <BadgesDisplay badges={companyBadges} size="md" className="mb-3" />
              )}

              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
                {company.name}
              </h1>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={company.status} />

                {regId && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                    <Hash className="h-3 w-3" />{regLabel}: {regId}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  {countryFlag} {countryName}
                </span>

                {company.city && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/15 text-white ring-1 ring-white/20">
                    <MapPin className="h-3 w-3" />{[company.city, company.state].filter(Boolean).join(", ")}
                  </span>
                )}

                {(company.viewCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                    <Eye className="h-3 w-3" />{company.viewCount?.toLocaleString()} views
                  </span>
                )}
              </div>
            </div>

            {/* Action column */}
            <div className="flex flex-wrap lg:flex-col items-start gap-2 lg:items-end shrink-0 ab-company-actions">
              <div className="flex items-center gap-3">
                <ShareBar
                  title={`${company.name} — Company Details`}
                  description={`View registration details and information for ${company.name}.`}
                />
                <a
                  href={`${pageCanonical}/report`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-100 hover:text-orange-300 transition-colors underline underline-offset-2"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Report
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="container-width py-8 flex gap-6">
        <ServiceAside side="left" />

        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Dynamic company introduction */}
            {(() => {
              const intro = buildCompanyIntro(company);
              return intro ? (
                <p className="text-sm leading-relaxed text-slate-600 px-1" data-testid="text-company-intro">
                  {intro}
                </p>
              ) : null;
            })()}

            {/* Country-specific data sections */}
            {company.countryCode === "IN"
              ? <IndiaOverviewSection company={company} />
              : company.countryCode === "US"
                ? <UsaOverviewSection company={company} />
                : <GlobalOverviewSection company={company} />}

            {/* Dynamic services paragraph */}
            <DynamicServicesParagraph company={company} />

            {/* Share & print bar */}
            <div className="ab-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Share this profile</p>
              <SharePrintBar
                companyName={company.name}
                url={typeof window !== "undefined" ? window.location.href : canonicalFull}
              />
            </div>

            {/* FAQ */}
            <CompanyFaqSection company={company} />

            {/* Related companies */}
            <RelatedCompanies company={company} />

            {/* Insights */}
            <InsightsWidget company={company} />

            {/* Reviews */}
            <ReviewsSection
              companyId={company.id}
              isLoggedIn={!!user}
              userEmail={(user as any)?.claims?.email ?? (user as any)?.email ?? undefined}
            />
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Contact card */}
            {(company.email || company.phone || company.address || company.city) && (
              <div className="ab-card ab-contact-card overflow-hidden">
                <div className="ab-color-head flex items-center gap-2.5 px-5 py-4 border-b">
                  <Phone className="h-4 w-4" />
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Contact Details</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {company.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Email</p>
                        <a href={`mailto:${company.email}`} className="text-sm text-primary hover:underline break-all">
                          {company.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                        <a href={`tel:${company.phone}`} className="text-sm text-slate-800 hover:underline">{company.phone}</a>
                      </div>
                    </div>
                  )}
                  {(company.address || company.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Registered Address</p>
                        <p className="text-sm text-slate-800 leading-relaxed">
                          {company.address && <>{company.address}<br /></>}
                          {[company.city, company.state, company.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick data card for sidebar */}
            {(company.incorporationDate || company.source) && (
              <div className="ab-card ab-keyfacts-card overflow-hidden">
                <div className="ab-color-head flex items-center gap-2.5 px-5 py-4 border-b">
                  <BookOpen className="h-4 w-4" />
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Key Facts</h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {company.incorporationDate && safeFormatDate(company.incorporationDate, "MMMM d, yyyy") && (
                    <div>
                      <p className="text-xs text-slate-400">Incorporated</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        {safeFormatDate(company.incorporationDate, "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {company.countryCode === "IN" && safeNumber(company.authorizedCapital) !== undefined && (
                    <div>
                      <p className="text-xs text-slate-400">Authorized Capital</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        ₹ {safeNumber(company.authorizedCapital)!.toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                  {company.source && (
                    <div>
                      <p className="text-xs text-slate-400">Data Source</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{company.source}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Permanent link */}
            <div className="ab-card p-4">
              <p className="text-xs text-slate-400 font-medium mb-1.5">Permanent Link</p>
              <Link href={pageCanonical} className="text-xs text-primary break-all hover:underline">
                {typeof window !== "undefined" ? `${window.location.origin}${pageCanonical}` : pageCanonical}
              </Link>
            </div>
          </div>
        </div>

        <ServiceAside side="right" />
      </div>

      <Footer />
    </div>
  );
}
function CompanyDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="bg-white border-b border-slate-200 py-8">
        <div className="container-width">
          <Skeleton className="h-4 w-64 mb-6" />
          <Skeleton className="h-9 w-2/3 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="container-width py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-slate-100 p-6 rounded-full mb-4">
          <Building2 className="h-12 w-12 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Company Not Found</h1>
        <p className="text-slate-500 mb-6">We couldn't locate the company you're looking for.</p>
        <Link href="/"><Button>Back to Directory</Button></Link>
      </div>
      <Footer />
    </div>
  );
}

function DataRow({ label, value, icon }: { label: string; value?: string | number | React.ReactNode | null; icon?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="ab-data-label py-3 pr-4 pl-0 w-44 text-sm text-slate-500 font-medium whitespace-nowrap align-top">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
      </td>
      <td className="py-3 text-sm text-slate-900 font-medium align-top">{value}</td>
    </tr>
  );
}

function SectionCard({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`ab-card ab-section-card ab-section-${title.toLowerCase().replace(/\s+/g, "-")} overflow-hidden`}>
      <div className="ab-section-head flex items-center gap-2.5 px-5 py-4 border-b">
        <span className="ab-section-icon flex h-8 w-8 items-center justify-center rounded-xl">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-5 py-2">
        <table className="w-full">
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function GlobalOverviewSection({ company }: { company: Company }) {
  const countryName = COUNTRY_NAMES[company.countryCode || ""] || company.country || company.countryCode || "";
  const regLabel = company.countryCode === "AU" ? "ACN" :
    company.countryCode === "GB" ? "Company No." :
    company.countryCode === "SG" ? "UEN" : "Reg. No.";

  return (
    <>
      <SectionCard title="Overview" icon={<Building2 className="h-4 w-4" />}>
        <DataRow label={regLabel} value={company.registrationNumber} icon={<Hash className="h-3.5 w-3.5" />} />
        <DataRow label="Status" value={company.status} />
        <DataRow label="Industry" value={company.industry} />
      </SectionCard>

      <SectionCard title="Registration" icon={<FileText className="h-4 w-4" />}>
        <DataRow
          label="Date of Incorporation"
          value={safeFormatDate(company.incorporationDate, "MMMM d, yyyy")}
          icon={<Calendar className="h-3.5 w-3.5" />}
        />
        <DataRow label="Source" value={company.source} icon={<Database className="h-3.5 w-3.5" />} />
      </SectionCard>

      <SectionCard title="Registered Address" icon={<MapPin className="h-4 w-4" />}>
        <DataRow label="Address" value={company.address} />
        <DataRow label="City" value={company.city} />
        <DataRow label="State" value={company.state} />
        <DataRow label="Pincode" value={company.pincode} />
        <DataRow label="Country" value={countryName} />
      </SectionCard>
    </>
  );
}

function UsaOverviewSection({ company }: { company: Company }) {
  return (
    <>
      <SectionCard title="Overview" icon={<Building2 className="h-4 w-4" />}>
        <DataRow label="Business Name" value={company.name} icon={<Building2 className="h-3.5 w-3.5" />} />
        <DataRow label="Public / Private" value={company.publicPrivate} />
        <DataRow label="Location Type" value={company.locationType} />
        <DataRow label="Firm / Individual" value={company.firmIndividual} />
        <DataRow
          label="Web Address"
          value={company.webAddress ? (
            <a
              href={/^https?:\/\//i.test(company.webAddress) ? company.webAddress : `http://${company.webAddress}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary hover:underline break-all"
            >
              {company.webAddress}
            </a>
          ) : undefined}
        />
        <DataRow label="Area Code & Ph No" value={company.phone} />
      </SectionCard>

      <SectionCard title="Mailing Address" icon={<MapPin className="h-4 w-4" />}>
        <DataRow label="Mailing Address" value={company.address} />
        <DataRow label="Mailing City" value={company.city} />
        <DataRow label="Mailing State" value={company.state} />
        <DataRow label="Mailing Zip" value={company.pincode} />
        <DataRow label="Country" value="United States" />
      </SectionCard>
    </>
  );
}

function IndiaOverviewSection({ company }: { company: Company }) {
  const hasFinancial = safeNumber(company.authorizedCapital) !== undefined || safeNumber(company.paidUpCapital) !== undefined;
  const hasCompliance = company.lastAgmDate || company.lastBalanceSheetDate;

  return (
    <>
      <SectionCard title="Overview" icon={<Building2 className="h-4 w-4" />}>
        <DataRow label="CIN" value={company.cin} icon={<Hash className="h-3.5 w-3.5" />} />
        <DataRow label="Class" value={company.class} />
        <DataRow label="Category" value={company.category} />
        <DataRow label="Sub-Category" value={company.subCategory} />
        <DataRow label="Industry" value={company.industry} />
        <DataRow label="ROC Code" value={company.roc} icon={<Landmark className="h-3.5 w-3.5" />} />
        <DataRow label="Status" value={company.status} />
      </SectionCard>

      <SectionCard title="Registration" icon={<FileText className="h-4 w-4" />}>
        <DataRow
          label="Date of Incorporation"
          value={safeFormatDate(company.incorporationDate, "MMMM d, yyyy")}
          icon={<Calendar className="h-3.5 w-3.5" />}
        />
        <DataRow label="Source" value={company.source} icon={<Database className="h-3.5 w-3.5" />} />
      </SectionCard>

      <SectionCard title="Registered Address" icon={<MapPin className="h-4 w-4" />}>
        <DataRow label="Address" value={company.address} />
        <DataRow label="District" value={company.district} />
        <DataRow label="City" value={company.city} />
        <DataRow label="State" value={company.state} />
        <DataRow label="Pincode" value={company.pincode} />
        <DataRow label="Country" value={COUNTRY_NAMES[company.countryCode || ""] || company.country || company.countryCode || undefined} />
      </SectionCard>

      {hasFinancial && (
        <SectionCard title="Financial" icon={<TrendingUp className="h-4 w-4" />}>
          <DataRow
            label="Authorized Capital"
            value={safeNumber(company.authorizedCapital) !== undefined ? `₹ ${safeNumber(company.authorizedCapital)!.toLocaleString("en-IN")}` : undefined}
            icon={<IndianRupee className="h-3.5 w-3.5" />}
          />
          <DataRow
            label="Paid-up Capital"
            value={safeNumber(company.paidUpCapital) !== undefined ? `₹ ${safeNumber(company.paidUpCapital)!.toLocaleString("en-IN")}` : undefined}
            icon={<IndianRupee className="h-3.5 w-3.5" />}
          />
        </SectionCard>
      )}

      {hasCompliance && (
        <SectionCard title="Compliance Dates" icon={<Clock className="h-4 w-4" />}>
          <DataRow
            label="Last AGM Date"
            value={safeFormatDate(company.lastAgmDate, "MMMM d, yyyy")}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <DataRow
            label="Last Balance Sheet"
            value={safeFormatDate(company.lastBalanceSheetDate, "MMMM d, yyyy")}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </SectionCard>
      )}
    </>
  );
}

function Breadcrumb({ company, countryName }: { company: Company; countryName: string }) {
  const cc = (company.countryCode || "in").toLowerCase();
  const items: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
    { label: countryName, href: `/countries/${cc}` },
  ];
  if (company.state) {
    items.push({ label: company.state, href: `/countries/${cc}/${encodeURIComponent(company.state)}` });
  }
  items.push({ label: company.name });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-0.5 text-sm text-indigo-100/70">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-indigo-200/50 shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="text-indigo-100/75 hover:text-orange-300 transition-colors truncate max-w-[160px]">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-white font-semibold truncate max-w-[200px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Returns formatted date string or undefined (never throws). DataRow hides undefined. */
function safeFormatDate(value: string | null | undefined, fmt: string): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) { console.warn("[CompanyDetails] Invalid date:", value); return undefined; }
    return format(d, fmt);
  } catch { console.warn("[CompanyDetails] Date format error:", value); return undefined; }
}

/** Returns locale date string or null (never throws). */
function safeLocaleDateString(value: string | null | undefined, options: Intl.DateTimeFormatOptions): string | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) { console.warn("[CompanyDetails] Invalid date:", value); return null; }
    return d.toLocaleDateString("en-IN", options);
  } catch { console.warn("[CompanyDetails] Date locale error:", value); return null; }
}

/** Returns full year number or null (never throws). */
function safeYear(value: string | null | undefined): number | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear();
  } catch { return null; }
}

/** Returns a finite number or undefined — never throws on string/null/undefined input. */
function safeNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!isFinite(n)) { console.warn("[CompanyDetails] Non-numeric capital value:", value); return undefined; }
  return n;
}
