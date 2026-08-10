import { Link } from "wouter";
import { type Company } from "@shared/schema";
import { MapPin, Calendar, Building, IndianRupee, Scale, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { addToCompare, isInCompare, removeFromCompare } from "./CompareBar";
import { BadgesDisplay, parseBadges } from "./BadgesDisplay";
import { useState, useEffect } from "react";

const COUNTRY_FLAGS: Record<string, string> = {
  IN: "🇮🇳", AU: "🇦🇺", GB: "🇬🇧", SG: "🇸🇬", US: "🇺🇸",
};

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", AU: "Australia", GB: "United Kingdom", SG: "Singapore", US: "United States",
};

/** Returns the canonical URL for a company: slug-based if possible, ID-based fallback. */
function companyUrl(company: Company): string {
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

export function CompanyCard({ company }: { company: Company }) {
  const regId = company.countryCode === "IN" ? company.cin : (company.registrationNumber || company.cin);
  const regLabel = company.countryCode === "AU" ? "ACN" :
    company.countryCode === "GB" ? "Company No." :
    company.countryCode === "SG" ? "UEN" :
    company.countryCode === "IN" ? "CIN" : "Reg. No.";

  const isIndia = !company.countryCode || company.countryCode === "IN";
  const countryFlag = COUNTRY_FLAGS[company.countryCode || ""] || "🌐";
  const countryName = COUNTRY_NAMES[company.countryCode || ""] || company.country || company.countryCode || "";

  const badges = parseBadges(company.badges);
  const [inCompare, setInCompare] = useState(() => isInCompare(company.id));
  useEffect(() => {
    const update = () => setInCompare(isInCompare(company.id));
    window.addEventListener("comparechange", update);
    return () => window.removeEventListener("comparechange", update);
  }, [company.id]);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inCompare) removeFromCompare(company.id);
    else addToCompare(company.id);
  };

  const countryClass = `ab-company-${(company.countryCode || "IN").toLowerCase()}`;

  return (
    <Link href={companyUrl(company)} className="flex flex-col group">
      <div className={`ab-card ab-company-card ${countryClass} flex-1 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="ab-card-header relative z-10 px-5 pt-5 pb-4 border-b border-white/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Reg ID + flag row */}
              <div className="flex items-center gap-2 mb-2">
                <span className="ab-card-icon flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" title={countryName}>
                  {countryFlag}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{countryName}</span>
                {regId && (
                  <span className="font-mono text-[10px] text-slate-500 tracking-wide truncate ml-auto">{regLabel}: {regId}</span>
                )}
              </div>
              {/* Company name */}
               <h3 className="text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[hsl(var(--card-accent))] transition-colors line-clamp-2">
                {company.name}
              </h3>
              {badges.length > 0 && <BadgesDisplay badges={badges} size="sm" className="mt-1.5" />}
            </div>
            {/* Status pill + compare */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusPill status={company.status} />
              <button
                onClick={handleCompare}
                title={inCompare ? "Remove from compare" : "Add to compare"}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ring-1 transition-all font-medium ${
                  inCompare
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                     : "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-violet-600 hover:text-white hover:ring-violet-600"
                }`}
              >
                <Scale className="h-3 w-3" />
                {inCompare ? "Added" : "Compare"}
              </button>
            </div>
          </div>
        </div>

        {/* Body — info rows */}
        <div className="relative z-10 px-5 py-4 flex-1 space-y-3">
          <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {company.city && company.state
                ? `${company.city}, ${company.state}`
                : company.city || company.state || (!isIndia ? countryName : "India")}
            </span>
          </div>
          {company.incorporationDate && (
            <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>Inc. {format(new Date(company.incorporationDate), "d MMM yyyy")}</span>
            </div>
          )}
          {(company.category || company.class) && (
            <div className="ab-card-meta flex items-center gap-2 text-xs text-slate-600">
              <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">
                {[company.category, company.class].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        {isIndia && company.authorizedCapital != null && (
          <div className="relative z-10 px-5 py-3 border-t border-white/70 bg-white/35 rounded-b-2xl">
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3 text-[hsl(var(--card-accent))]" />
              <span>Auth. Capital: <span className="font-medium text-slate-600">{Number(company.authorizedCapital).toLocaleString("en-IN")}</span></span>
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--card-accent))] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
