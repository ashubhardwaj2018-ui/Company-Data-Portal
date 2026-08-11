/**
 * LLP card — mirrors the CompanyCard design (India accent) and links to /llps/:id.
 */
import { Link } from "wouter";
import type { Llp } from "@shared/schema";
import { MapPin, Calendar, Building, IndianRupee, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

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

function fmtDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : format(dt, "d MMM yyyy");
}

export function LlpCard({ llp }: { llp: Llp }) {
  const regDate = fmtDate(llp.registrationDate);
  return (
    <Link href={`/llps/${llp.id}`} className="flex flex-col group" data-testid={`card-llp-${llp.id}`}>
      <div className="ab-card ab-company-card ab-company-in flex-1 flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="ab-card-header relative z-10 px-5 pt-5 pb-4 border-b border-white/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="ab-card-icon flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" title="India">
                  🇮🇳
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Indian LLP</span>
                {llp.llpin && (
                  <span className="font-mono text-[10px] text-slate-500 tracking-wide truncate ml-auto">LLPIN: {llp.llpin}</span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[hsl(var(--card-accent))] transition-colors line-clamp-2">
                {llp.name}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusPill status={llp.status} />
            </div>
          </div>
        </div>

        {/* Body — info rows */}
        <div className="relative z-10 px-5 py-4 flex-1 space-y-3">
          <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {llp.district && llp.state ? `${llp.district}, ${llp.state}` : llp.district || llp.state || "India"}
            </span>
          </div>
          {regDate && (
            <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>Reg. {regDate}{llp.roc ? ` · ${llp.roc}` : ""}</span>
            </div>
          )}
          {llp.industry && (
            <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
              <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{llp.industry}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 px-5 py-3 border-t border-white/70 bg-white/35 rounded-b-2xl">
          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              {llp.totalObligation != null ? (
                <>
                  <IndianRupee className="h-3 w-3 text-[hsl(var(--card-accent))]" />
                  <span>Obligation: <span className="font-medium text-slate-600">{Number(llp.totalObligation).toLocaleString("en-IN")}</span></span>
                </>
              ) : (
                <span className="text-slate-400">View details</span>
              )}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--card-accent))] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
