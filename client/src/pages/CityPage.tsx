import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { CompanyCardSkeleton } from "@/components/companies/CompanyCardSkeleton";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Company } from "@shared/schema";

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  IN: { name: "India",          flag: "🇮🇳" },
  AU: { name: "Australia",      flag: "🇦🇺" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  SG: { name: "Singapore",      flag: "🇸🇬" },
};

function fromSlug(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityPage() {
  const [, params] = useRoute("/countries/:countryCode/:state/:city");
  const countryCode = (params?.countryCode || "in").toUpperCase();
  const stateSlug  = params?.state || "";
  const citySlug   = params?.city  || "";
  const stateName  = fromSlug(stateSlug);
  const cityName   = fromSlug(citySlug);
  const meta = COUNTRY_NAMES[countryCode];

  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data, isLoading } = useQuery<{
    data: Company[]; total: number; page: number; limit: number;
  }>({
    queryKey: ["/api/companies", { countryCode, state: stateName, city: cityName, page, limit: LIMIT }],
    queryFn: async () => {
      const p = new URLSearchParams({ countryCode, state: stateName, city: cityName, page: String(page), limit: String(LIMIT) });
      const res = await fetch(`/api/companies?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const title = `${cityName} Companies${meta ? ` — ${meta.flag} ${meta.name}` : ""} | AddressBay`;
  const desc  = `Browse ${data?.total?.toLocaleString() ?? ""} registered companies in ${cityName}, ${stateName}${meta ? `, ${meta.name}` : ""}. Official business registration data.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-14">
        <div className="container-width">
          <Link href={`/countries/${countryCode.toLowerCase()}/${stateSlug}`}>
            <button className="flex items-center gap-2 text-blue-300 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to {stateName}
            </button>
          </Link>
          <div className="flex items-start gap-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <MapPin className="h-10 w-10 text-blue-300" />
            </div>
            <div>
              <p className="text-blue-300 text-sm font-medium uppercase tracking-widest mb-1">
                {meta?.flag} {meta?.name} · {stateName}
              </p>
              <h1 className="text-4xl md:text-5xl font-display font-bold">{cityName}</h1>
              <p className="text-blue-200 mt-2">
                {isLoading ? "Loading…" : `${data?.total?.toLocaleString() ?? 0} registered companies`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b py-2">
        <div className="container-width [&_nav]:mb-0">
          <Breadcrumbs items={[
            { label: meta?.name || countryCode, href: `/countries/${countryCode.toLowerCase()}` },
            { label: stateName, href: `/countries/${countryCode.toLowerCase()}/${stateSlug}` },
            { label: cityName },
          ]} />
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CompanyCardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Building2 className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No companies found in {cityName}</h3>
            <p className="text-muted-foreground mb-6">Try browsing the full {stateName} directory.</p>
            <Link href={`/countries/${countryCode.toLowerCase()}/${stateSlug}`}>
              <Button variant="outline">View {stateName} Directory</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {data.data.map(c => <CompanyCard key={c.id} company={c} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
