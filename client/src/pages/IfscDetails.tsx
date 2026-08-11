/**
 * IFSC code detail page — mirrors the company details page layout for Indian bank branches.
 */
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { IfscCode, Company } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareBar } from "@/components/layout/ShareBar";
import { ServiceAside } from "@/components/layout/ServiceAside";
import { SharePrintBar } from "@/components/companies/SharePrintBar";
import { DynamicServicesParagraph } from "@/components/companies/DynamicServicesParagraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Landmark, MapPin, Hash, ChevronRight, ArrowLeft, Copy, Check,
  Building2, Globe, ExternalLink, Lightbulb, HelpCircle, CreditCard,
} from "lucide-react";
import { getIfscSeoStatus } from "@shared/seo";

// ── Small helpers ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy IFSC" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline" size="sm"
      className="bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      data-testid="button-copy-ifsc"
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
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

function DataRow({ label, value, icon, mono }: { label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap align-top w-40">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
      </td>
      <td className={`py-2.5 text-sm text-slate-800 ${mono ? "font-mono font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}

function buildIfscIntro(r: IfscCode): string {
  let s = `${r.ifsc} is the IFSC code of ${r.bank}`;
  if (r.branch) s += `, ${r.branch} branch`;
  const loc = [r.city, r.district, r.state].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).join(", ");
  if (loc) s += `, located in ${loc}`;
  s += ". This 11-character code is required for NEFT, RTGS, and IMPS fund transfers to accounts held at this branch.";
  if (r.address) s += ` The branch address is ${r.address}.`;
  return s;
}

// ── Insights ──────────────────────────────────────────────────────────────────
function buildIfscInsights(r: IfscCode): string[] {
  const insights: string[] = [];
  insights.push(`The first four characters "${r.ifsc.slice(0, 4)}" identify ${r.bank}; the last six "${r.ifsc.slice(5)}" identify the ${r.branch || "branch"}.`);
  if (r.district && r.state) insights.push(`This branch serves customers in ${r.district}, ${r.state}.`);
  insights.push(`Use ${r.ifsc} for NEFT, RTGS, and IMPS transfers — all three work with the same code.`);
  insights.push(`Always confirm the IFSC with your payee before transferring; a wrong code can delay or misdirect funds.`);
  return insights.slice(0, 4);
}

function IfscInsightsWidget({ row }: { row: IfscCode }) {
  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50" data-testid="section-ifsc-insights">
      <CardHeader className="border-b border-amber-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Branch Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ul className="space-y-3">
          {buildIfscInsights(row).map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
              <span className="mt-0.5 text-amber-400 text-base leading-none">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqRow({ label, value }: { label: string; value?: string | null }) {
  return <p><span className="text-slate-400 w-36 inline-block">{label}</span> {value || "N/A"}</p>;
}

function IfscFaqSection({ row }: { row: IfscCode }) {
  const loc = [row.city, row.district, row.state].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).join(", ");
  return (
    <div className="ab-card overflow-hidden" data-testid="section-ifsc-faq">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Frequently Asked Questions</h2>
      </div>
      <div className="px-5 py-2">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="what" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What is the IFSC code of {row.bank}{row.branch ? `, ${row.branch} branch` : ""}?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <p>The IFSC code is <span className="font-mono font-semibold text-slate-800">{row.ifsc}</span>. IFSC (Indian Financial System Code) is an 11-character alphanumeric code assigned by the Reserve Bank of India to every bank branch that participates in electronic fund transfers.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="transfers" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">Can I use {row.ifsc} for NEFT, RTGS, and IMPS?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <p>Yes. The same IFSC code works for all three electronic transfer systems — NEFT (batch transfers), RTGS (large-value real-time transfers), and IMPS (instant 24×7 transfers).</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="location" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">Where is this branch located?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              {row.address && <FaqRow label="Address" value={row.address} />}
              <FaqRow label="City" value={row.city} />
              <FaqRow label="District" value={row.district} />
              <FaqRow label="State" value={row.state} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="structure" className="border-slate-100 last:border-0">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">How is an IFSC code structured?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <p>An IFSC has 11 characters: the first 4 letters identify the bank ({row.ifsc.slice(0, 4)} = {row.bank}), the 5th character is always 0 (reserved), and the last 6 characters identify the specific branch ({row.ifsc.slice(5)}{row.branch ? ` = ${row.branch}` : ""}).</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

// ── Suggested branches ───────────────────────────────────────────────────────
function SuggestedBranches({ row }: { row: IfscCode }) {
  const { data: related = [] } = useQuery<IfscCode[]>({
    queryKey: [`/api/ifsc/${row.ifsc}/related`],
    queryFn: async () => {
      const res = await fetch(`/api/ifsc/${row.ifsc}/related`);
      if (!res.ok) return [];
      return res.json();
    },
  });
  if (!related.length) return null;
  return (
    <div className="ab-card overflow-hidden" data-testid="section-suggested-branches">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/60">
        <Landmark className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Other Branches</h2>
        <span className="ml-auto text-[11px] text-slate-400 normal-case tracking-normal">mostly {row.bank}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {related.map(r => (
          <Link key={r.id} href={`/ifsc/${r.ifsc}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors group"
            data-testid={`link-suggested-ifsc-${r.ifsc}`}>
            <div className="min-w-0 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary"><Landmark className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800 group-hover:text-primary transition-colors truncate">{r.bank}{r.branch ? ` — ${r.branch}` : ""}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {[r.city, r.district, r.state].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="font-mono text-xs font-semibold text-primary">{r.ifsc}</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
        <Link href={`/ifsc?search=${encodeURIComponent(row.bank)}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
            All {row.bank} branches
          </Badge>
        </Link>
        <Link href="/ifsc">
          <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
            IFSC Finder
          </Badge>
        </Link>
        <Link href="/">
          <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
            Company Directory
          </Badge>
        </Link>
      </div>
    </div>
  );
}

// ── Suggested companies (from the main directory) ────────────────────────────
const SUGGESTION_FLAGS: Record<string, string> = {
  IN: "🇮🇳", AU: "🇦🇺", GB: "🇬🇧", SG: "🇸🇬", US: "🇺🇸",
};
function companyUrl(c: Company): string {
  return c.slug && c.countryCode ? `/${c.countryCode.toLowerCase()}/company/${c.slug}` : `/company/${c.id}`;
}
function SuggestedCompanies() {
  const { data } = useQuery<{ data: Company[] }>({
    queryKey: ["/api/companies", { page: 1, limit: 5, forIfscPage: true }],
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IfscDetails() {
  const [, params] = useRoute("/ifsc/:code");
  const code = (params?.code || "").toUpperCase();

  const { data: row, isLoading, isError } = useQuery<IfscCode>({
    queryKey: [`/api/ifsc/${code}`],
    queryFn: async () => {
      const res = await fetch(`/api/ifsc/${code}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: code.length > 0,
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

  if (isError || !row) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
          <Landmark className="h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">IFSC code not found.</p>
          <Link href="/ifsc"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to IFSC Finder</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const canonicalFull = `${siteOrigin}/ifsc/${row.ifsc}`;
  const branchLabel = `${row.bank}${row.branch ? `, ${row.branch} branch` : ""}`;
  const pageTitle = `${row.ifsc} — ${branchLabel} IFSC Code & Branch Details`;
  const pageDesc = buildIfscIntro(row);
  const loc = [row.city, row.district, row.state].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BankOrCreditUnion",
    name: branchLabel,
    identifier: row.ifsc,
    url: canonicalFull,
    address: {
      "@type": "PostalAddress",
      ...(row.address && { streetAddress: row.address }),
      ...(row.city && { addressLocality: row.city }),
      ...(row.state && { addressRegion: row.state }),
      addressCountry: "IN",
    },
  };

  return (
    <div className="ab-details-page min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="robots" content={getIfscSeoStatus(row).robots} />
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
            <Link href="/ifsc" className="text-indigo-100/75 hover:text-orange-300 transition-colors">IFSC Finder</Link>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-200/50 shrink-0" />
            <span aria-current="page" className="text-white font-semibold truncate max-w-[240px]">{row.ifsc}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3" data-testid="text-ifsc-heading">
                {branchLabel}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 font-bold" data-testid="text-ifsc-chip">
                  <Hash className="h-3 w-3" />{row.ifsc}
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  🇮🇳 India
                </span>
                {loc && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/15 text-white ring-1 ring-white/20">
                    <MapPin className="h-3 w-3" />{loc}
                  </span>
                )}
                <CopyButton text={row.ifsc} />
              </div>
            </div>
            <div className="shrink-0">
              <ShareBar
                title={`${row.ifsc} — ${branchLabel}`}
                description={`IFSC code and branch details for ${branchLabel}.`}
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
            <p className="text-sm leading-relaxed text-slate-600 px-1" data-testid="text-ifsc-intro">
              {buildIfscIntro(row)}
            </p>

            <SectionCard title="Branch Details" icon={<Landmark className="h-4 w-4" />}>
              <DataRow label="IFSC Code" value={row.ifsc} icon={<Hash className="h-3.5 w-3.5" />} mono />
              <DataRow label="Bank" value={row.bank} icon={<Landmark className="h-3.5 w-3.5" />} />
              <DataRow label="Branch" value={row.branch} icon={<Building2 className="h-3.5 w-3.5" />} />
              <DataRow label="Payment Systems" value="NEFT, RTGS, IMPS" icon={<CreditCard className="h-3.5 w-3.5" />} />
            </SectionCard>

            <SectionCard title="Location" icon={<MapPin className="h-4 w-4" />}>
              <DataRow label="Address" value={row.address} icon={<MapPin className="h-3.5 w-3.5" />} />
              <DataRow label="City" value={row.city} icon={<Building2 className="h-3.5 w-3.5" />} />
              <DataRow label="District" value={row.district} icon={<MapPin className="h-3.5 w-3.5" />} />
              <DataRow label="State" value={row.state} icon={<Globe className="h-3.5 w-3.5" />} />
              <DataRow label="Country" value="India" icon={<Globe className="h-3.5 w-3.5" />} />
            </SectionCard>

            {/* Services paragraph (uses admin-configured service links) */}
            <DynamicServicesParagraph company={{ country: "India" }} />

            {/* Share & print bar */}
            <div className="ab-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Share this page</p>
              <SharePrintBar
                companyName={`${row.ifsc} — ${branchLabel}`}
                url={typeof window !== "undefined" ? window.location.href : canonicalFull}
              />
            </div>

            {/* FAQ */}
            <IfscFaqSection row={row} />

            <div className="pt-2">
              <Link href="/ifsc">
                <Button variant="outline" size="sm" data-testid="button-back-ifsc">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to IFSC Finder
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <IfscInsightsWidget row={row} />
            <SuggestedBranches row={row} />
            <SuggestedCompanies />
          </div>
        </div>

        <ServiceAside side="right" />
      </div>

      <Footer />
    </div>
  );
}
