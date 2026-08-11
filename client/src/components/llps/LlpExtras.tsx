/**
 * LLP page extras — Insights widget, auto-generated FAQ, and Suggested LLPs.
 * Mirrors the equivalent company-page features.
 */
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Llp } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lightbulb, HelpCircle, Briefcase, ExternalLink } from "lucide-react";
import { differenceInYears } from "date-fns";

// ── Insights ──────────────────────────────────────────────────────────────────
function buildLlpInsights(llp: Llp): string[] {
  const insights: string[] = [];

  if (llp.registrationDate) {
    const regDate = new Date(llp.registrationDate);
    if (!isNaN(regDate.getTime())) {
      const age = differenceInYears(new Date(), regDate);
      const year = regDate.getFullYear();
      if (age >= 15) insights.push(`${llp.name} is an established LLP — ${age} years since registration.`);
      else if (age <= 3) insights.push(`A relatively young LLP, registered in ${year}.`);
      else insights.push(`Registered in ${year} — ${age} years of operating history.`);
    }
  }

  if (llp.totalObligation != null) {
    const cr = llp.totalObligation / 10_000_000;
    if (cr >= 10) insights.push(`With ₹${cr.toFixed(0)}Cr+ obligation of contribution, this is a large LLP by capital commitment.`);
    else if (cr >= 1) insights.push(`Obligation of contribution of ₹${cr.toFixed(1)}Cr places it in the mid-sized segment.`);
    else insights.push(`Obligation of contribution of ₹${(llp.totalObligation / 100_000).toFixed(1)}L indicates a small-scale partnership.`);
  }

  const status = llp.status?.toLowerCase() || "";
  if (status.includes("active")) insights.push(`The LLP holds an Active status with the Registrar of Companies.`);
  else if (status.includes("strike") || status.includes("defunct")) insights.push(`⚠️ This LLP is marked ${llp.status} — it may no longer be operating.`);

  if (llp.industry) insights.push(`Classified under the ${llp.industry} sector.`);
  if (llp.district && llp.state) insights.push(`Registered office is in ${llp.district}, ${llp.state}.`);

  return insights.slice(0, 4);
}

export function LlpInsightsWidget({ llp }: { llp: Llp }) {
  const insights = buildLlpInsights(llp);
  if (!insights.length) return null;
  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50" data-testid="section-llp-insights">
      <CardHeader className="border-b border-amber-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" /> LLP Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ul className="space-y-3">
          {insights.map((insight, i) => (
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
function Row({ label, value }: { label: string; value?: string | null }) {
  return <p><span className="text-slate-400 w-36 inline-block">{label}</span> {value || "N/A"}</p>;
}

function fmtLongDate(d: string | null): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

export function LlpFaqSection({ llp }: { llp: Llp }) {
  return (
    <div className="ab-card overflow-hidden" data-testid="section-llp-faq">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Frequently Asked Questions</h2>
      </div>
      <div className="px-5 py-2">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="overview" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What type of entity is {llp.name}?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <p>{llp.name} is a Limited Liability Partnership (LLP) registered under the LLP Act, 2008 with the Ministry of Corporate Affairs, India.</p>
              <Row label="Status" value={llp.status} />
              {llp.industry && <Row label="Industry" value={llp.industry} />}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="registration" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">When was {llp.name} registered?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <Row label="LLPIN" value={llp.llpin} />
              <Row label="Registered" value={fmtLongDate(llp.registrationDate)} />
              <Row label="ROC" value={llp.roc} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="capital" className="border-slate-100">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">What is the capital commitment of {llp.name}?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              <Row label="Total Obligation" value={llp.totalObligation != null ? `₹ ${Number(llp.totalObligation).toLocaleString("en-IN")}` : undefined} />
              <p className="text-xs text-slate-400 pt-1">Total obligation of contribution is the capital the partners have committed to the LLP.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="location" className="border-slate-100 last:border-0">
            <AccordionTrigger className="font-medium text-sm py-4 text-slate-800">Where is {llp.name} located?</AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-1.5 text-sm pb-4">
              {llp.address && <Row label="Address" value={llp.address} />}
              <Row label="District" value={llp.district} />
              <Row label="State" value={llp.state} />
              <Row label="Country" value="India" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

// ── Suggested LLPs ───────────────────────────────────────────────────────────
function llpStatusPill(status?: string | null) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const cls = lower.includes("active") ? "ab-status-active"
    : lower.includes("strike") || lower.includes("dissolv") || lower.includes("defunct") ? "ab-status-dissolved"
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

export function SuggestedLlps({ llp }: { llp: Llp }) {
  const { data: related = [] } = useQuery<Llp[]>({
    queryKey: [`/api/llps/${llp.id}/related`],
    queryFn: async () => {
      const res = await fetch(`/api/llps/${llp.id}/related`);
      if (!res.ok) return [];
      return res.json();
    },
  });
  if (!related.length) return null;
  return (
    <div className="ab-card overflow-hidden" data-testid="section-suggested-llps">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/60">
        <Briefcase className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Suggested LLPs</h2>
        {llp.state && <span className="ml-auto text-[11px] text-slate-400 normal-case tracking-normal">mostly from {llp.state}</span>}
      </div>
      <div className="divide-y divide-slate-100">
        {related.map(r => (
          <Link key={r.id} href={`/llps/${r.id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors group"
            data-testid={`link-suggested-llp-${r.id}`}>
            <div className="min-w-0 flex items-center gap-3">
              <span className="text-lg shrink-0" title="India">🇮🇳</span>
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800 group-hover:text-primary transition-colors truncate">{r.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {[r.llpin, r.district, r.state].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {llpStatusPill(r.status)}
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
        {llp.state && (
          <Link href={`/llps?search=${encodeURIComponent(llp.state)}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
              LLPs in {llp.state}
            </Badge>
          </Link>
        )}
        <Link href="/llps">
          <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 text-xs border-slate-200 text-slate-600">
            Browse all LLPs
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
