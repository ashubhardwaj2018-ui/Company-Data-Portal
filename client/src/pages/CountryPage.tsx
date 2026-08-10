import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyCardSkeleton } from "@/components/companies/CompanyCardSkeleton";
import { ArrowLeft, Building2, MapPin, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";
import type { Company } from "@shared/schema";

// ── Country metadata ──────────────────────────────────────────────────────────
const COUNTRY_META: Record<string, { name: string; flag: string; registrar: string; regLabel: string }> = {
  IN: { name: "India",          flag: "🇮🇳", registrar: "Ministry of Corporate Affairs (MCA)", regLabel: "CIN" },
  AU: { name: "Australia",      flag: "🇦🇺", registrar: "Australian Securities and Investments Commission (ASIC)", regLabel: "ACN" },
  GB: { name: "United Kingdom", flag: "🇬🇧", registrar: "Companies House",                     regLabel: "Company No." },
  SG: { name: "Singapore",      flag: "🇸🇬", registrar: "Accounting and Corporate Regulatory Authority (ACRA)", regLabel: "UEN" },
  US: { name: "United States",  flag: "🇺🇸", registrar: "Secretary of State (varies by state)",               regLabel: "EIN" },
};

function stateSlug(state: string): string {
  return state.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CountryPage() {
  const [, params] = useRoute("/countries/:countryCode");
  const countryCode = (params?.countryCode || "in").toUpperCase();
  const meta = COUNTRY_META[countryCode];
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  // Directory stats (total + top states)
  const { data: stats, isLoading: statsLoading } = useQuery<{
    total: number;
    byState: { state: string | null; count: number }[];
    byCountry: { countryCode: string | null; count: number }[];
  }>({
    queryKey: ["/api/directory/stats", countryCode],
    queryFn: async () => {
      const res = await fetch(`/api/directory/stats/${countryCode.toLowerCase()}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Company listing for this country, paginated
  const { data, isLoading: companiesLoading } = useQuery<{
    data: Company[]; total: number; page: number; limit: number;
  }>({
    queryKey: ["/api/companies", { countryCode, page, limit: LIMIT }],
    queryFn: async () => {
      const res = await fetch(`/api/companies?countryCode=${countryCode}&page=${page}&limit=${LIMIT}`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  if (!meta) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Country Not Supported</h1>
          <Link href="/"><Button>Back to Directory</Button></Link>
        </div>
      </div>
    );
  }

  const namedStates = (stats?.byState || []).filter(s => s.state);
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  const pageTitle = `${meta.name} Company Directory — Search Registered Businesses`;
  const pageDesc = `Search and browse all ${meta.name} companies registered with ${meta.registrar}. View registration details, addresses, and contact information.`;
  const canonicalFull = typeof window !== "undefined"
    ? `${window.location.origin}/countries/${countryCode.toLowerCase()}`
    : `/countries/${countryCode.toLowerCase()}`;

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
      <div className="ab-hero text-white py-16 relative overflow-hidden">
        <div className="container-width">
          <div className="[&_ol]:text-white/50 [&_a:hover]:text-white [&_span[aria-current]]:text-white">
            <Breadcrumbs items={[{ label: "Countries" }, { label: meta.name }]} />
          </div>
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white mb-6 pl-0 hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
            </Button>
          </Link>
          <div className="flex items-end gap-6">
            <span className="text-7xl">{meta.flag}</span>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-white/10 border-0 text-white text-xs">{countryCode}</Badge>
                <Badge className="bg-white/10 border-0 text-white text-xs">{meta.registrar}</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold">{meta.name} Company Directory</h1>
              <p className="text-white/60 mt-2 text-lg">
                {statsLoading
                  ? "Loading..."
                  : `${(stats?.total || 0).toLocaleString()} registered companies`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-width py-12 space-y-12">

        {/* Browse by State */}
        {!statsLoading && namedStates.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" /> Browse by State / Region
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {namedStates.map(({ state, count }) => (
                <Link
                  key={state}
                  href={`/countries/${countryCode.toLowerCase()}/${stateSlug(state!)}`}
                  className="group flex flex-col items-start p-4 bg-white rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100 transition-all"
                >
                  <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                    {state}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {count.toLocaleString()} {count === 1 ? "company" : "companies"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary mt-2 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Company listing */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              All {meta.name} Companies
              {data?.total != null && (
                <span className="text-sm font-sans font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full ml-2">
                  {data.total.toLocaleString()} records
                </span>
              )}
            </h2>
          </div>

          {companiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <CompanyCardSkeleton key={i} />
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="text-center py-20 border rounded-2xl bg-muted/20">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No companies yet for this country.</p>
              <p className="text-xs text-muted-foreground mt-1">Import data via the admin panel to populate this directory.</p>
            </div>
          ) : (
            <>
              <div className="ab-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
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
        </section>
      </div>

      <Footer />
    </div>
  );
}
