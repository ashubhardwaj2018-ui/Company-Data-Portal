/**
 * LLP detail page — mirrors the company details page layout for Indian LLPs.
 */
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Llp } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShareBar } from "@/components/layout/ShareBar";
import {
  Building2, MapPin, Calendar, FileText, Mail, IndianRupee,
  ArrowLeft, Hash, Landmark, ChevronRight, Briefcase, Globe, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import type { Company } from "@shared/schema";
import { ServiceAside } from "@/components/layout/ServiceAside";
import { SharePrintBar } from "@/components/companies/SharePrintBar";
import { DynamicServicesParagraph } from "@/components/companies/DynamicServicesParagraph";
import { LlpInsightsWidget, LlpFaqSection, SuggestedLlps } from "@/components/llps/LlpExtras";

// ── Suggested companies (from the main directory) ────────────────────────────
const SUGGESTION_FLAGS: Record<string, string> = {
  IN: "🇮🇳", AU: "🇦🇺", GB: "🇬🇧", SG: "🇸🇬", US: "🇺🇸",
};
function companyUrl(c: Company): string {
  return c.slug && c.countryCode ? `/${c.countryCode.toLowerCase()}/company/${c.slug}` : `/company/${c.id}`;
}
function SuggestedCompanies() {
  const { data } = useQuery<{ data: Company[] }>({
    queryKey: ["/api/companies", { page: 1, limit: 5, forLlpPage: true }],
    queryFn: async () => {
      const res = await fetch("/api/companies?page=1&limit=5");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });
  const companies = data?.data || [];
  if (!companies.length) return null;
  return (
    <div className="ab-card overflow-hidden" data-testid="section-suggested-companies">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/60">
        <Globe className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Suggested Companies</h2>
        <span className="ml-auto text-[11px] text-slate-400 normal-case tracking-normal">from the directory</span>
      </div>
      <div className="divide-y divide-slate-100">
        {companies.map(c => {
          const cc = (c.countryCode || "IN").toUpperCase();
          return (
            <Link key={c.id} href={companyUrl(c)}
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
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary shrink-0 ml-3" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const cls = lower.includes("active")
    ? "ab-status-active"
    : lower.includes("strike") || lower.includes("dissolv") || lower.includes("wound") || lower.includes("defunct")
    ? "ab-status-dissolved"
    : "ab-status-inactive";
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${
        lower.includes("active") ? "bg-emerald-500" :
        lower.includes("strike") || lower.includes("dissolv") || lower.includes("defunct") ? "bg-red-500" : "bg-slate-400"
      }`} />
      {status}
    </span>
  );
}

function safeFormatDate(d: string | null, fmt: string): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : format(dt, fmt);
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`ab-card ab-section-card ab-section-${title.toLowerCase().replace(/\s+/g, "-")} overflow-hidden`}>
      <div className="ab-section-head flex items-center gap-2.5 px-5 py-4 border-b">
        <span className="ab-section-icon flex h-8 w-8 items-center justify-center rounded-xl">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-5 py-2">
        <table className="w-full"><tbody>{children}</tbody></table>
      </div>
    </div>
  );
}

function DataRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap align-top w-40">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
      </td>
      <td className="py-2.5 text-sm text-slate-800">{value}</td>
    </tr>
  );
}

function buildLlpIntro(llp: Llp): string {
  const parts: string[] = [];
  const year = llp.registrationDate ? new Date(llp.registrationDate).getFullYear() : null;
  parts.push(`${llp.name} is a Limited Liability Partnership (LLP) registered in India`);
  if (llp.district || llp.state) parts.push(`based in ${[llp.district, llp.state].filter(Boolean).join(", ")}`);
  let s = parts.join(", ") + ".";
  if (year && !isNaN(year)) s += ` It was incorporated in ${year}${llp.roc ? ` under ${llp.roc}` : ""}.`;
  if (llp.llpin) s += ` Its LLP Identification Number (LLPIN) is ${llp.llpin}.`;
  if (llp.status) s += ` The LLP is currently listed as ${llp.status.toLowerCase()}.`;
  if (llp.industry) s += ` Its principal activity is ${llp.industry.toLowerCase()}.`;
  return s;
}

export default function LlpDetails() {
  const [, params] = useRoute("/llps/:id");
  const id = Number(params?.id || 0);

  const { data: llp, isLoading, isError } = useQuery<Llp>({
    queryKey: [`/api/llps/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/llps/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: id > 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-width py-10 space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !llp) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
          <Briefcase className="h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">LLP not found.</p>
          <Link href="/llps"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to LLP Directory</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const canonicalFull = `${siteOrigin}/llps/${llp.id}`;
  const pageTitle = `${llp.name}${llp.llpin ? ` — LLPIN: ${llp.llpin}` : ""} | Indian LLP Details`;
  const pageDesc = buildLlpIntro(llp);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: llp.name,
    url: canonicalFull,
    ...(llp.email && { email: llp.email }),
    address: {
      "@type": "PostalAddress",
      ...(llp.address && { streetAddress: llp.address }),
      ...(llp.district && { addressLocality: llp.district }),
      ...(llp.state && { addressRegion: llp.state }),
      addressCountry: "IN",
    },
    ...(llp.registrationDate && { foundingDate: llp.registrationDate }),
  };

  return (
    <div className="ab-details-page min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalFull} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalFull} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <div className="ab-hero text-white border-b border-indigo-900">
        <div className="container-width py-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-0.5 text-sm text-indigo-100/70 mb-5">
            <Link href="/" className="text-indigo-100/75 hover:text-orange-300 transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-200/50 shrink-0" />
            <Link href="/llps" className="text-indigo-100/75 hover:text-orange-300 transition-colors">Indian LLPs</Link>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-200/50 shrink-0" />
            <span aria-current="page" className="text-white font-semibold truncate max-w-[240px]">{llp.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3" data-testid="text-llp-name">
                {llp.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={llp.status} />
                {llp.llpin && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                    <Hash className="h-3 w-3" />LLPIN: {llp.llpin}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  🇮🇳 India
                </span>
                {(llp.district || llp.state) && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/15 text-white ring-1 ring-white/20">
                    <MapPin className="h-3 w-3" />{[llp.district, llp.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <ShareBar
                title={`${llp.name} — LLP Details`}
                description={`View registration details for ${llp.name}.`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container-width py-8 flex gap-6">
        <ServiceAside side="left" />

        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-5">
          <p className="text-sm leading-relaxed text-slate-600 px-1" data-testid="text-llp-intro">
            {buildLlpIntro(llp)}
          </p>

          <SectionCard title="Overview" icon={<Building2 className="h-4 w-4" />}>
            <DataRow label="LLPIN" value={llp.llpin} icon={<Hash className="h-3.5 w-3.5" />} />
            <DataRow label="Status" value={llp.status} />
            <DataRow label="Industry" value={llp.industry} icon={<Briefcase className="h-3.5 w-3.5" />} />
            <DataRow label="ROC" value={llp.roc} icon={<Landmark className="h-3.5 w-3.5" />} />
          </SectionCard>

          <SectionCard title="Registration" icon={<FileText className="h-4 w-4" />}>
            <DataRow
              label="Date of Registration"
              value={safeFormatDate(llp.registrationDate, "MMMM d, yyyy")}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <DataRow
              label="Total Obligation"
              value={llp.totalObligation != null ? `₹ ${Number(llp.totalObligation).toLocaleString("en-IN")}` : undefined}
              icon={<IndianRupee className="h-3.5 w-3.5" />}
            />
          </SectionCard>

          <SectionCard title="Registered Address" icon={<MapPin className="h-4 w-4" />}>
            <DataRow label="Address" value={llp.address} />
            <DataRow label="District" value={llp.district} />
            <DataRow label="State" value={llp.state} />
            <DataRow label="Country" value="India" />
          </SectionCard>

          {llp.email && (
            <SectionCard title="Contact" icon={<Mail className="h-4 w-4" />}>
              <DataRow label="Email" value={llp.email} icon={<Mail className="h-3.5 w-3.5" />} />
            </SectionCard>
          )}

          {/* Services paragraph (uses admin-configured service links) */}
          <DynamicServicesParagraph company={{ country: "India" }} />

          {/* Share & print bar */}
          <div className="ab-card p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Share this profile</p>
            <SharePrintBar
              companyName={llp.name}
              url={typeof window !== "undefined" ? window.location.href : canonicalFull}
            />
          </div>

          {/* FAQ */}
          <LlpFaqSection llp={llp} />

          <div className="pt-2">
            <Link href="/llps">
              <Button variant="outline" size="sm" data-testid="button-back-llps">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to LLP Directory
              </Button>
            </Link>
          </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <LlpInsightsWidget llp={llp} />
            <SuggestedLlps llp={llp} />
            <SuggestedCompanies />
          </div>
        </div>

        <ServiceAside side="right" />
      </div>

      <Footer />
    </div>
  );
}
