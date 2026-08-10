import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { type Company } from "@shared/schema";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { CompanyCardSkeleton } from "@/components/companies/CompanyCardSkeleton";
import { SearchAutocomplete } from "@/components/companies/SearchAutocomplete";
import { AdvancedFiltersDrawer } from "@/components/companies/AdvancedFiltersDrawer";
import {
  Loader2, ChevronLeft, ChevronRight, ArrowRight, TrendingUp,
  Building2, Globe, Shield, Database, Filter, X, ChevronDown,
  BarChart3, Briefcase, Cpu, Factory, HeartPulse, ShoppingBag,
  GraduationCap, Truck, Scale, Home as HomeIcon,
} from "lucide-react";
import type { Service } from "@shared/schema";
import { motion } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  {
    name: "India",
    code: "IN",
    flag: "🇮🇳",
    count: "20L+",
    desc: "MCA Registered",
    reg: "Ministry of Corporate Affairs",
    cities: ["Mumbai", "Delhi", "Bengaluru"],
    href: "/countries/in",
  },
  {
    name: "Australia",
    code: "AU",
    flag: "🇦🇺",
    count: "2.8M+",
    desc: "ASIC Registered",
    reg: "Australian Securities & Investments Commission",
    cities: ["Sydney", "Melbourne", "Brisbane"],
    href: "/countries/au",
  },
  {
    name: "United Kingdom",
    code: "GB",
    flag: "🇬🇧",
    count: "5M+",
    desc: "Companies House",
    reg: "UK Companies House",
    cities: ["London", "Manchester", "Birmingham"],
    href: "/countries/gb",
  },
  {
    name: "Singapore",
    code: "SG",
    flag: "🇸🇬",
    count: "500K+",
    desc: "ACRA Registered",
    reg: "Accounting & Corporate Regulatory Authority",
    cities: ["Singapore City"],
    href: "/countries/sg",
  },
  {
    name: "USA",
    code: "US",
    flag: "🇺🇸",
    count: "30M+",
    desc: "State Registered",
    reg: "State Secretary of State databases",
    cities: ["New York", "Los Angeles", "Chicago"],
    href: "/countries/us",
  },
];

const INDUSTRIES = [
  { name: "Technology", slug: "technology", icon: Cpu, color: "bg-violet-50 text-violet-700 border-violet-100" },
  { name: "Manufacturing", slug: "manufacturing", icon: Factory, color: "bg-amber-50 text-amber-700 border-amber-100" },
  { name: "Finance", slug: "finance", icon: BarChart3, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { name: "Healthcare", slug: "healthcare", icon: HeartPulse, color: "bg-rose-50 text-rose-700 border-rose-100" },
  { name: "Construction", slug: "construction", icon: HomeIcon, color: "bg-orange-50 text-orange-700 border-orange-100" },
  { name: "Retail", slug: "retail", icon: ShoppingBag, color: "bg-pink-50 text-pink-700 border-pink-100" },
  { name: "Education", slug: "education", icon: GraduationCap, color: "bg-blue-50 text-blue-700 border-blue-100" },
  { name: "Logistics", slug: "logistics", icon: Truck, color: "bg-slate-50 text-slate-700 border-slate-200" },
];

const POPULAR_SEARCHES = [
  "Reliance Industries", "Tata Motors", "Infosys", "HDFC Bank",
  "Wipro Limited", "Bajaj Finance", "ITC Limited", "Maruti Suzuki",
];

const STATS = [
  { label: "Companies indexed", value: "28M+", icon: Database },
  { label: "Countries covered", value: "5", icon: Globe },
  { label: "Data accuracy", value: "99.9%", icon: Shield },
  { label: "Basic access", value: "Free", icon: Building2 },
];

function readUrlParam(key: string) {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

function useTrending(countryCode?: string) {
  return useQuery<Company[]>({
    queryKey: ["/api/companies/trending", countryCode],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "6" });
      if (countryCode) p.set("countryCode", countryCode);
      const res = await fetch(`/api/companies/trending?${p}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Country Selector ─────────────────────────────────────────────────────────

function CountrySelector({
  value, onChange,
}: { value?: string; onChange: (code: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find(c => c.code === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-full px-3 border-r border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-w-[100px] whitespace-nowrap"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base">{selected?.flag ?? "🌐"}</span>
        <span>{selected?.name ?? "All"}</span>
        <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1" role="listbox">
          <button
            onClick={() => { onChange(undefined); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${!value ? "text-primary font-semibold" : "text-slate-700"}`}
          >
            <Globe className="h-4 w-4" /> All Countries
          </button>
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              role="option"
              aria-selected={value === c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${value === c.code ? "text-primary font-semibold" : "text-slate-700"}`}
            >
              <span className="text-base">{c.flag}</span> {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [search, setSearch] = useState(() => readUrlParam("q") || "");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(() => readUrlParam("q") || "");
  const [alphabet, setAlphabet] = useState<string | undefined>(() => readUrlParam("alphabet"));
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(() => readUrlParam("countryCode"));
  const [statusFilter, setStatusFilter] = useState<string>(() => readUrlParam("status") || "");
  const [advFilters, setAdvFilters] = useState<{
    minCapital?: string; maxCapital?: string;
    incorporatedAfter?: string; incorporatedBefore?: string; sortBy?: string;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Sync URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("q", debouncedSearch);
    if (selectedCountry) p.set("countryCode", selectedCountry);
    if (statusFilter) p.set("status", statusFilter);
    if (alphabet) p.set("alphabet", alphabet);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [debouncedSearch, selectedCountry, statusFilter, alphabet]);

  const handleSearch = (v: string) => {
    setSearch(v);
    const id = setTimeout(() => {
      setDebouncedSearch(v);
      setAlphabet(undefined);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  };

  const handleAlphabetClick = (letter: string) => {
    setAlphabet(prev => prev === letter ? undefined : letter);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleCountrySelect = (code: string | undefined) => {
    setSelectedCountry(code);
    setSearch("");
    setDebouncedSearch("");
    setAlphabet(undefined);
    setPage(1);
  };

  const advActiveCount = Object.values(advFilters).filter(Boolean).length;

  const params: Record<string, any> = { page, limit: 12 };
  if (debouncedSearch) params.search = debouncedSearch;
  if (alphabet) params.alphabet = alphabet;
  if (selectedCountry) params.countryCode = selectedCountry;
  if (statusFilter) params.status = statusFilter;
  if (advFilters.minCapital) params.minCapital = advFilters.minCapital;
  if (advFilters.maxCapital) params.maxCapital = advFilters.maxCapital;
  if (advFilters.incorporatedAfter) params.incorporatedAfter = advFilters.incorporatedAfter;
  if (advFilters.incorporatedBefore) params.incorporatedBefore = advFilters.incorporatedBefore;
  if (advFilters.sortBy) params.sortBy = advFilters.sortBy;

  const queryString = new URLSearchParams(params).toString();

  const { data, isLoading, isError } = useQuery<{
    data: Company[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["/api/companies", params],
    queryFn: async () => {
      const res = await fetch(`/api/companies?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: trendingCompanies = [] } = useTrending(selectedCountry);

  const { data: servicesList } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  const activeServices = (servicesList || []).filter(s => s.isActive);

  // Phase 35 — Live stats
  const { data: dirStats } = useQuery<{ total: number }>({
    queryKey: ["/api/directory/stats"],
    queryFn: async () => {
      const res = await fetch("/api/directory/stats");
      if (!res.ok) return { total: 0 };
      return res.json();
    },
    staleTime: 10 * 60_000,
  });

  // Phase 33 — IP Geolocation (silent, once on mount)
  useEffect(() => {
    if (selectedCountry) return;
    const SUPPORTED = ["IN", "AU", "GB", "SG"];
    fetch("https://ip-api.com/json?fields=countryCode", { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then(d => {
        if (d?.countryCode && SUPPORTED.includes(d.countryCode)) setSelectedCountry(d.countryCode);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCountry = COUNTRIES.find(c => c.code === selectedCountry);
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const isFiltered = !!(debouncedSearch || alphabet || selectedCountry || statusFilter || advActiveCount);
  const hasResults = !isLoading && !isError && (data?.data?.length ?? 0) > 0;
  const showHero = !isFiltered;

  const siteTitle = selectedCountry
    ? `${activeCountry?.name} Companies — AddressBay Global Directory`
    : "AddressBay — Global Company Discovery Platform";
  const siteDesc = selectedCountry
    ? `Browse registered ${activeCountry?.name} companies. Official government registration data including addresses, contacts, and corporate details.`
    : "Search millions of registered companies across India, Australia, UK, Singapore and USA. Official government data — fast, free, and always up to date.";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDesc} />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.origin + "/" : "/"} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDesc} />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────── */}
      {showHero && (
        <section className="ab-hero text-white relative overflow-hidden">
          <div className="container-width py-16 md:py-24 text-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Global Business Intelligence</p>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                Discover Companies &amp;{" "}
               <span className="text-orange-300">Businesses</span>
                {" "}Worldwide
              </h1>
              <p className="mt-4 text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
                Official government registration data from India, Australia, UK, Singapore &amp; USA — all in one place.
              </p>

              {/* Stats strip */}
              {dirStats?.total ? (
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-slate-400">
                  <span><span className="font-bold text-white text-base">{dirStats.total.toLocaleString()}</span> companies indexed</span>
                  <span className="w-px h-3 bg-slate-600" />
                  <span>5 countries</span>
                  <span className="w-px h-3 bg-slate-600" />
                  <span>Official government data</span>
                </div>
              ) : null}
            </motion.div>

            {/* ── Search Bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="max-w-3xl mx-auto mt-10"
            >
               <div className="flex items-center bg-white rounded-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden border-2 border-white/70">
                <CountrySelector value={selectedCountry} onChange={handleCountrySelect} />
                <div className="flex-1">
                  <SearchAutocomplete
                    value={search}
                    onChange={v => setSearch(v)}
                    onSearch={v => {
                      setDebouncedSearch(v);
                      setSearch(v);
                      setAlphabet(undefined);
                      setPage(1);
                    }}
                    countryCode={selectedCountry}
                  />
                </div>
              </div>

              {/* Popular searches */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Popular:</span>
                {POPULAR_SEARCHES.slice(0, 6).map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setSearch(q);
                      setDebouncedSearch(q);
                      setAlphabet(undefined);
                      setPage(1);
                    }}
                     className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-indigo-100 hover:bg-orange-400 hover:text-slate-950 transition-all border border-white/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── COUNTRY CARDS ─────────────────────────────────────── */}
      {showHero && (
        <section className="border-b border-amber-100 bg-[#fffaf1]">
          <div className="container-width py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Browse by Country</h2>
              <span className="text-xs text-slate-500">{COUNTRIES.length} countries available</span>
            </div>
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 ab-stagger">
              {COUNTRIES.map(country => (
                <div
                  key={country.code}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 cursor-pointer group flex flex-col items-center gap-1.5 hover:border-primary/40 hover:shadow-md transition-all"
                  onClick={() => handleCountrySelect(country.code)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && handleCountrySelect(country.code)}
                  aria-label={`Browse ${country.name} companies`}
                  data-testid={`button-country-${country.code.toLowerCase()}`}
                >
                  <img
                    src={`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`}
                    srcSet={`https://flagcdn.com/w320/${country.code.toLowerCase()}.png 2x`}
                    alt={`${country.name} flag`}
                    loading="lazy"
                    className="h-9 w-auto rounded shadow-sm ring-1 ring-black/10 group-hover:scale-105 transition-transform"
                  />
                  <span className="text-xs font-semibold text-slate-800 text-center group-hover:text-primary transition-colors">
                    {country.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── INDUSTRY DISCOVERY ────────────────────────────────── */}
      {showHero && (
        <section className="border-b border-slate-100">
          <div className="container-width py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Browse by Industry</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {INDUSTRIES.map(ind => {
                const Icon = ind.icon;
                return (
                  <Link
                    key={ind.slug}
                    href={`/industry/${ind.slug}`}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${ind.color} hover:shadow-sm transition-all text-center group`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{ind.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── PARTNER SERVICES ─────────────────────────────────── */}
      {showHero && activeServices.length > 0 && (
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="container-width py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Sponsored</p>
                <h2 className="text-lg font-bold text-slate-900">Recommended Services</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeServices.slice(0, 8).map((svc: any) => (
                <a
                  key={svc.id}
                  href={svc.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors leading-tight">
                      {svc.name}
                    </h3>
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Partner
                    </span>
                  </div>
                  {svc.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{svc.description}</p>
                  )}
                  <p className="mt-3 text-xs font-semibold text-primary flex items-center gap-1">
                    Explore Service <ArrowRight className="h-3 w-3" />
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MAIN DIRECTORY ────────────────────────────────────── */}
      <section className="flex-1">
        <div className="container-width py-8">
          {/* Filtered state: show active filter pill + back */}
          {isFiltered && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex flex-wrap gap-2">
                {selectedCountry && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary/8 text-primary rounded-full border border-primary/20">
                    {COUNTRIES.find(c => c.code === selectedCountry)?.flag} {activeCountry?.name}
                    <button onClick={() => handleCountrySelect(undefined)} aria-label="Remove country filter">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
                    "{debouncedSearch}"
                    <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} aria-label="Clear search">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("")} aria-label="Remove status filter">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filter toolbar */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Search (when below hero) */}
            {isFiltered && (
              <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden max-w-2xl">
                <CountrySelector value={selectedCountry} onChange={handleCountrySelect} />
                <div className="flex-1">
                  <SearchAutocomplete
                    value={search}
                    onChange={v => setSearch(v)}
                    onSearch={v => {
                      setDebouncedSearch(v);
                      setSearch(v);
                      setAlphabet(undefined);
                      setPage(1);
                    }}
                    countryCode={selectedCountry}
                  />
                </div>
              </div>
            )}

              <div className="ab-filter-bar flex flex-wrap items-center gap-3 rounded-2xl p-2 sm:p-3">
              {/* Status */}
                <div className="ab-status-tabs flex items-center gap-1.5 border rounded-xl px-1 py-1 overflow-x-auto max-w-full">
                {["", "Active", "Strike-off", "Dissolved"].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap ${
                      statusFilter === s
                        ? "is-active"
                        : ""
                    }`}
                    data-status={s === "" ? "all" : s === "Active" ? "active" : s === "Strike-off" ? "strike" : "dissolved"}
                  >
                    {s || "All Status"}
                  </button>
                ))}
              </div>

              {/* Advanced filters */}
              <button
                onClick={() => setShowFilters(true)}
                    className={`ab-filter-button flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border transition-all ${
                  advActiveCount > 0
                    ? "border-primary text-primary bg-primary/5"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters{advActiveCount > 0 && ` (${advActiveCount})`}
              </button>

              {/* Result count */}
              {data && (
                <span className="text-xs text-slate-500 ml-auto">
                  {data.total.toLocaleString()} companies
                </span>
              )}
            </div>

            {/* Alphabet strip */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-violet-50/45 p-2 border border-violet-100/80">
              {alphabets.map(letter => (
                <button
                  key={letter}
                  onClick={() => handleAlphabetClick(letter)}
                  className={`ab-letter-chip w-7 h-7 text-xs font-semibold rounded-lg border ${
                    alphabet === letter
                      ? "is-active"
                      : ""
                  }`}
                >
                  {letter}
                </button>
              ))}
              {alphabet && (
                <button
                  onClick={() => setAlphabet(undefined)}
                  className="flex items-center gap-1 px-2 h-7 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded bg-white"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Results grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {Array.from({ length: 6 }).map((_, i) => (
                <CompanyCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 border border-slate-100 rounded-lg">
              <p className="font-semibold text-slate-900 mb-1">Something went wrong</p>
              <p className="text-sm text-slate-500">Could not load companies. Please try again.</p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-20 border border-slate-100 rounded-lg">
              <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-900 mb-1">No companies found</p>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or removing filters.</p>
              {isFiltered && (
                <button
                  onClick={() => { setSearch(""); setDebouncedSearch(""); setAlphabet(undefined); setStatusFilter(""); handleCountrySelect(undefined); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {data!.data.map(company => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = page <= 3 ? i + 1 : page + i - 2;
                      if (pg < 1 || pg > totalPages) return null;
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                            pg === page ? "bg-slate-900 text-white" : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── TRENDING ─────────────────────────────────────────── */}
      {!isFiltered && trendingCompanies.length > 0 && (
        <section className="ab-section bg-slate-50">
          <div className="container-width">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-900">Trending Companies</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {trendingCompanies.slice(0, 6).map(company => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STATS ─────────────────────────────────────────────── */}
      {showHero && (
        <section className="border-t border-slate-100 bg-white">
          <div className="container-width py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <Icon className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <AdvancedFiltersDrawer
        filters={advFilters}
        onChange={(f: typeof advFilters) => { setAdvFilters(f); setPage(1); }}
        activeCount={advActiveCount}
        open={showFilters}
        onOpenChange={setShowFilters}
      />

      <Footer />
    </div>
  );
}
