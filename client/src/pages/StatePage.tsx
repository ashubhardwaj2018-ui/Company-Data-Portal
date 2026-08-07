import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Company } from "@shared/schema";

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  IN: { name: "India",          flag: "🇮🇳" },
  AU: { name: "Australia",      flag: "🇦🇺" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  SG: { name: "Singapore",      flag: "🇸🇬" },
};

/** Convert URL slug back to a display name: "tamil-nadu" → "Tamil Nadu" */
function stateFromSlug(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function StatePage() {
  const [, params] = useRoute("/countries/:countryCode/:state");
  const countryCode = (params?.countryCode || "in").toUpperCase();
  const stateSlug = params?.state || "";
  const stateName = stateFromSlug(stateSlug);
  const meta = COUNTRY_NAMES[countryCode];

  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data, isLoading } = useQuery<{
    data: Company[]; total: number; page: number; limit: number;
  }>({
    queryKey: ["/api/companies", { countryCode, state: stateName, page, limit: LIMIT }],
    queryFn: async () => {
      const res = await fetch(
        `/api/companies?countryCode=${countryCode}&state=${encodeURIComponent(stateName)}&page=${page}&limit=${LIMIT}`
      );
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  const pageTitle = `${stateName} Companies — ${meta?.name || countryCode} Business Directory`;
  const pageDesc = `Browse registered companies in ${stateName}, ${meta?.name || countryCode}. Find contact details, registration numbers, and business information for ${data?.total ? data.total.toLocaleString() : "all"} companies.`;
  const canonicalFull = typeof window !== "undefined"
    ? `${window.location.origin}/countries/${countryCode.toLowerCase()}/${stateSlug}`
    : `/countries/${countryCode.toLowerCase()}/${stateSlug}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalFull} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalFull} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
      </Helmet>
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="container-width">
          <Link href={`/countries/${countryCode.toLowerCase()}`}>
            <Button variant="ghost" className="text-white/60 hover:text-white mb-6 pl-0 hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {meta?.flag} {meta?.name} Directory
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge className="bg-white/10 border-0 text-white text-xs">{countryCode}</Badge>
            <Badge className="bg-white/10 border-0 text-white text-xs">{stateName}</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            {stateName} Companies
          </h1>
          <p className="text-white/60 mt-2 text-lg">
            {data?.total != null
              ? `${data.total.toLocaleString()} registered companies in ${stateName}`
              : "Loading..."}
          </p>
        </div>
      </div>

      <div className="container-width py-12">

        {/* Breadcrumb links */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Directory</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/countries/${countryCode.toLowerCase()}`} className="hover:text-primary transition-colors">
            {meta?.flag} {meta?.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{stateName}</span>
        </div>

        {/* City quick-links derived from current page results */}
        {!isLoading && data?.data && data.data.length > 0 && (() => {
          const cities = Array.from(new Set(data.data.map((c: Company) => c.city).filter(Boolean))) as string[];
          if (!cities.length) return null;
          const citySlug = (c: string) => c.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          return (
            <div className="mb-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Browse by City</p>
              <div className="flex flex-wrap gap-2">
                {cities.slice(0, 20).map(city => (
                  <Link key={city} href={`/countries/${countryCode.toLowerCase()}/${stateSlug}/${citySlug(city)}`}>
                    <span className="px-3 py-1.5 text-sm rounded-full border bg-background hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer">
                      {city}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">No Companies Found</h3>
            <p className="text-muted-foreground text-sm">
              No companies registered in {stateName} yet.
            </p>
            <Link href={`/countries/${countryCode.toLowerCase()}`} className="mt-6 inline-block">
              <Button variant="outline">← View all {meta?.name} companies</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data?.data.map(company => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-8 border-t mt-8">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <BacklinkGrid />
    </div>
  );
}
