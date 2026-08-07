import { Link } from "wouter";
import { type Company } from "@shared/schema";
import { MapPin, Calendar, Building, IndianRupee, Scale } from "lucide-react";
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

  return (
    <Link href={companyUrl(company)} className="flex flex-col group">
      <div className="ab-card flex-1 flex flex-col hover:-translate-y-0.5 transition-transform duration-200">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Reg ID + flag row */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {!isIndia && (
                  <span className="text-base leading-none" title={countryName}>{countryFlag}</span>
                )}
                {regId && (
                  <span className="font-mono text-[11px] text-slate-400 tracking-wide truncate">{regLabel}: {regId}</span>
                )}
              </div>
              {/* Company name */}
              <h3 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-primary transition-colors line-clamp-2">
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
                    : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-violet-50 hover:text-violet-600 hover:ring-violet-200"
                }`}
              >
                <Scale className="h-3 w-3" />
                {inCompare ? "Added" : "Compare"}
              </button>
            </div>
          </div>
        </div>

        {/* Body — info rows */}
        <div className="px-4 py-3 flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {company.city && company.state
                ? `${company.city}, ${company.state}`
                : company.city || company.state || (!isIndia ? countryName : "India")}
            </span>
          </div>
          {company.incorporationDate && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>Inc. {format(new Date(company.incorporationDate), "d MMM yyyy")}</span>
            </div>
          )}
          {(company.category || company.class) && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">
                {[company.category, company.class].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        {isIndia && company.authorizedCapital != null && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-lg">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <IndianRupee className="h-3 w-3 text-slate-400" />
              <span>Auth. Capital: <span className="font-medium text-slate-600">{Number(company.authorizedCapital).toLocaleString("en-IN")}</span></span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
