import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
/**
 * Phase 18 — Industry Browse Page
 * URL: /industry/:slug
 */
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyCardSkeleton } from "@/components/companies/CompanyCardSkeleton";
import { ArrowLeft, Briefcase, ChevronLeft, ChevronRight, MapPin, Search, X } from "lucide-react";
import type { Company } from "@shared/schema";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "GB", name: "United Kingdom" },
  { code: "SG", name: "Singapore" },
  { code: "US", name: "United States" },
];

function fromSlug(s: string) {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function IndustryPage() {
  const [, params] = useRoute("/industry/:slug");
  const industrySlug = params?.slug || "";
  const industryName = fromSlug(industrySlug);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [alphabet, setAlphabet] = useState<string | undefined>();
  const [countryCode, setCountryCode] = useState("");
  const [state, setState] = useState("");
  const LIMIT = 12;

  const { data, isLoading } = useQuery<{ data: Company[]; total: number }>({
    queryKey: ["/api/companies", { industry: industryName, search: query, alphabet, countryCode, state, page, limit: LIMIT }],
    queryFn: async () => {
      const p = new URLSearchParams({ industry: industryName, page: String(page), limit: String(LIMIT) });
      if (query) p.set("search", query);
      if (alphabet) p.set("alphabet", alphabet);
      if (countryCode) p.set("countryCode", countryCode);
      if (state) p.set("state", state);
      const res = await fetch(`/api/companies?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: regionStats } = useQuery<{
    byState: { state: string | null; count: number }[];
  }>({
    queryKey: ["/api/directory/stats", countryCode],
    queryFn: async () => {
      const res = await fetch(`/api/directory/stats/${countryCode.toLowerCase()}`);
      if (!res.ok) return { byState: [] };
      return res.json();
    },
    enabled: Boolean(countryCode),
    staleTime: 10 * 60_000,
  });

  const regions = (regionStats?.byState || []).filter(region => region.state);
  const hasFilters = Boolean(query || alphabet || countryCode || state);
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const title = `${industryName} Companies — AddressBay`;
  const desc = `Browse ${data?.total?.toLocaleString() ?? ""} companies in the ${industryName} industry. Find contact details and registration data.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta name="robots" content={typeof window !== "undefined" && window.location.search ? "noindex, follow" : "index, follow"} />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.origin + window.location.pathname : ""} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
      </Helmet>
      <Navbar />

       <div className="ab-hero text-white py-14 relative overflow-hidden">
        <div className="container-width">
          <Link href="/"><button className="flex items-center gap-2 text-indigo-300 hover:text-white text-sm mb-6 transition-colors"><ArrowLeft className="h-4 w-4" /> Directory</button></Link>
          <div className="flex items-start gap-4">
            <div className="bg-white/10 rounded-2xl p-4"><Briefcase className="h-10 w-10 text-indigo-300" /></div>
            <div>
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Industry</p>
              <h1 className="text-4xl md:text-5xl font-display font-bold">{industryName}</h1>
              <p className="text-indigo-200 mt-2">{isLoading ? "Loading…" : `${data?.total?.toLocaleString() ?? 0} registered companies`}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border-b py-2">
        <div className="container-width [&_nav]:mb-0">
          <Breadcrumbs items={[{ label: "Industries" }, { label: industryName }]} />
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        <div className="rounded-2xl border bg-card p-4 md:p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3">
            <form
              className="relative"
              onSubmit={event => {
                event.preventDefault();
                setQuery(search.trim());
                setPage(1);
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={`Search ${industryName} companies by name`}
                aria-label={`Search ${industryName} companies by name`}
                className="pl-10 pr-20"
              />
              <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8">
                Search
              </Button>
            </form>

            <select
              value={countryCode}
              onChange={event => {
                setCountryCode(event.target.value);
                setState("");
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter industry companies by country"
            >
              <option value="">All countries</option>
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>

            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setAlphabet(undefined);
                  setCountryCode("");
                  setState("");
                  setPage(1);
                }}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter companies by first letter">
            <span className="mr-1 text-sm font-medium text-muted-foreground">Name A–Z:</span>
            <Button
              type="button"
              size="sm"
              variant={!alphabet ? "default" : "outline"}
              onClick={() => { setAlphabet(undefined); setPage(1); }}
              className="h-8 px-3"
            >
              All
            </Button>
            {ALPHABET.map(letter => (
              <Button
                key={letter}
                type="button"
                size="sm"
                variant={alphabet === letter ? "default" : "outline"}
                onClick={() => { setAlphabet(letter); setPage(1); }}
                className="h-8 w-8 p-0"
                aria-pressed={alphabet === letter}
              >
                {letter}
              </Button>
            ))}
          </div>

          {countryCode && regions.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Browse by State / Region</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={!state ? "default" : "outline"}
                  onClick={() => { setState(""); setPage(1); }}
                >
                  All regions
                </Button>
                {regions.map(region => (
                  <Button
                    key={region.state}
                    type="button"
                    size="sm"
                    variant={state === region.state ? "default" : "outline"}
                    onClick={() => { setState(region.state!); setPage(1); }}
                    className="h-auto py-1.5"
                  >
                    {region.state} <span className="ml-1 opacity-60">({region.count.toLocaleString()})</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isLoading && data && (
          <p className="text-sm text-muted-foreground mb-5">{data.total.toLocaleString()} matching companies</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CompanyCardSkeleton key={i} />)}
          </div>
        ) : !data?.data.length ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Briefcase className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No matching {industryName} companies</h3>
            <p className="text-muted-foreground mb-6">Try clearing the name, alphabet, country, or region filters.</p>
            <Link href="/"><Button variant="outline">Browse All Companies</Button></Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {data.data.map(c => <CompanyCard key={c.id} company={c} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
