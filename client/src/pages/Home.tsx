import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Company } from "@shared/schema";
import { Navbar } from "@/components/layout/Navbar";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, ChevronLeft, ChevronRight, Building,
  TrendingUp, Globe, Shield, Database, ArrowRight, Zap, Star, Users
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const COUNTRIES = [
  {
    name: "India",
    flag: "🇮🇳",
    gradient: "from-orange-500 via-white to-green-600",
    bg: "bg-gradient-to-br from-orange-50 to-green-50",
    border: "border-orange-200",
    activeBg: "bg-gradient-to-br from-orange-500 to-green-600",
    textColor: "text-orange-700",
    count: "20L+",
    desc: "MCA Registered"
  },
  {
    name: "Australia",
    flag: "🇦🇺",
    gradient: "from-blue-600 via-red-600 to-blue-800",
    bg: "bg-gradient-to-br from-blue-50 to-sky-50",
    border: "border-blue-200",
    activeBg: "bg-gradient-to-br from-blue-600 to-sky-700",
    textColor: "text-blue-700",
    count: "2.8M+",
    desc: "ASIC Registered"
  },
  {
    name: "Singapore",
    flag: "🇸🇬",
    gradient: "from-red-600 to-white",
    bg: "bg-gradient-to-br from-red-50 to-pink-50",
    border: "border-red-200",
    activeBg: "bg-gradient-to-br from-red-500 to-pink-600",
    textColor: "text-red-700",
    count: "500K+",
    desc: "ACRA Registered"
  },
  {
    name: "UK",
    flag: "🇬🇧",
    gradient: "from-blue-800 via-red-600 to-blue-900",
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    border: "border-indigo-200",
    activeBg: "bg-gradient-to-br from-blue-800 to-indigo-900",
    textColor: "text-blue-900",
    count: "5M+",
    desc: "Companies House"
  },
];

const FEATURES = [
  {
    icon: <Database className="h-8 w-8" />,
    title: "20 Lakh+ Records",
    desc: "Comprehensive database of all MCA registered companies",
    color: "from-violet-500 to-purple-700",
    bg: "bg-violet-50",
    iconColor: "text-violet-600"
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Instant Search",
    desc: "Find any company by name, CIN, email in milliseconds",
    color: "from-yellow-400 to-orange-500",
    bg: "bg-yellow-50",
    iconColor: "text-yellow-600"
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Verified Data",
    desc: "Data sourced directly from Ministry of Corporate Affairs",
    color: "from-green-500 to-emerald-700",
    bg: "bg-green-50",
    iconColor: "text-green-600"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Multi-Country",
    desc: "Browse companies from India, Australia, Singapore & UK",
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600"
  },
];

const STATS = [
  { value: "20L+", label: "Indian Companies", color: "text-orange-600" },
  { value: "4", label: "Countries Covered", color: "text-blue-600" },
  { value: "99.9%", label: "Data Accuracy", color: "text-green-600" },
  { value: "Free", label: "Basic Access", color: "text-purple-600" },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [alphabet, setAlphabet] = useState<string | undefined>();
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>();

  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const numbers = "0123456789".split("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setAlphabet(undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleAlphabetClick = (letter: string) => {
    if (alphabet === letter) {
      setAlphabet(undefined);
    } else {
      setAlphabet(letter);
      setSearch("");
      setDebouncedSearch("");
    }
    setPage(1);
  };

  const handleCountryClick = (country: string) => {
    if (selectedCountry === country) {
      setSelectedCountry(undefined);
    } else {
      setSelectedCountry(country);
      setSearch("");
      setDebouncedSearch("");
      setAlphabet(undefined);
    }
    setPage(1);
  };

  const params: Record<string, any> = { page, limit: 12 };
  if (debouncedSearch) params.search = debouncedSearch;
  if (alphabet) params.alphabet = alphabet;
  if (selectedCountry) params.country = selectedCountry;

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
  });

  const activeCountry = COUNTRIES.find(c => c.name === selectedCountry);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white py-20">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        <div className="container-width relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-white/10 border-white/20 text-white mb-4 text-sm px-4 py-1">
              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
              Trusted by 50,000+ professionals
            </Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-tight">
              Global Corporate{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-yellow-400">
                Directory
              </span>
            </h1>
            <p className="mt-4 text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
              Search over 20 lakh registered companies in India and millions more across Australia, Singapore & UK.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="max-w-2xl mx-auto relative"
          >
            <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl" />
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-2">
              <Search className="h-6 w-6 text-slate-400 ml-3 shrink-0" />
              <Input
                className="border-0 shadow-none focus-visible:ring-0 text-lg py-6 bg-transparent text-slate-900 placeholder:text-slate-400"
                placeholder="Search by company name, CIN, email..."
                value={search}
                onChange={handleSearch}
              />
              <Button size="lg" className="rounded-xl px-8 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 border-0 hidden sm:flex text-white">
                Search
              </Button>
            </div>
          </motion.div>

          {/* COUNTRY BUTTONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-blue-200 text-sm mb-4 font-medium uppercase tracking-widest">Browse by Country</p>
            <div className="flex flex-wrap justify-center gap-4">
              {COUNTRIES.map((country) => {
                const isActive = selectedCountry === country.name;
                return (
                  <button
                    key={country.name}
                    onClick={() => handleCountryClick(country.name)}
                    className={`group relative flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border-2 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 min-w-[140px] ${
                      isActive
                        ? "border-white/60 " + country.activeBg + " text-white scale-105"
                        : "border-white/20 bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <span className="text-4xl">{country.flag}</span>
                    <div className="text-center">
                      <p className="font-bold text-lg leading-none">{country.name}</p>
                      <p className={`text-xs mt-1 ${isActive ? "text-white/80" : "text-blue-200"}`}>{country.count} • {country.desc}</p>
                    </div>
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                        Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* STATS BANNER */}
      <div className="bg-white border-b py-8">
        <div className="container-width">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="space-y-1">
                <p className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALPHABET FILTER */}
      <div className="bg-slate-50 border-b py-4">
        <div className="container-width">
          <div className="flex flex-wrap justify-center gap-1.5">
            <Button
              variant={!alphabet && !selectedCountry ? "default" : "ghost"}
              size="sm"
              className="h-9 px-3 text-xs font-bold rounded-lg"
              onClick={() => { setAlphabet(undefined); setSelectedCountry(undefined); setSearch(""); setDebouncedSearch(""); setPage(1); }}
            >
              All
            </Button>
            {[...alphabets, ...numbers].map((char) => (
              <Button
                key={char}
                variant={alphabet === char ? "default" : "ghost"}
                size="sm"
                className={`w-9 h-9 p-0 rounded-lg text-xs font-bold ${alphabet === char ? "" : "hover:bg-primary/10"}`}
                onClick={() => handleAlphabetClick(char)}
              >
                {char}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS SECTION */}
      <main className="flex-1 py-12 container-width">
        {/* Active filter label */}
        {(selectedCountry || debouncedSearch || alphabet) && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-muted-foreground">Showing results for:</span>
            {selectedCountry && (
              <Badge className={`gap-1 text-sm px-3 py-1 ${activeCountry?.activeBg} text-white border-0`}>
                {activeCountry?.flag} {selectedCountry}
              </Badge>
            )}
            {debouncedSearch && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                "{debouncedSearch}"
              </Badge>
            )}
            {alphabet && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Starts with "{alphabet}"
              </Badge>
            )}
            <button
              onClick={() => { setAlphabet(undefined); setSelectedCountry(undefined); setSearch(""); setDebouncedSearch(""); setPage(1); }}
              className="text-xs text-muted-foreground hover:text-destructive underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Fetching company records...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-destructive">Unable to load data</h3>
            <p className="text-muted-foreground">Please try again later.</p>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No companies found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-display">
                {selectedCountry ? `${activeCountry?.flag} ${selectedCountry} Companies` : debouncedSearch ? "Search Results" : "Company Directory"}
                <span className="ml-2 text-sm font-sans font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {data?.total?.toLocaleString()} records
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data?.data.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-8 border-t">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground bg-muted px-4 py-2 rounded-lg">
                Page {page} of {Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 1)))}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={(data?.data?.length ?? 0) < (data?.limit || 12)}
                className="gap-2"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* FEATURES SECTION */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50 border-t">
        <div className="container-width">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-slate-900">Why Choose IndiaCorpDB?</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">The most comprehensive and up-to-date corporate directory in South Asia.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className={`${f.bg} rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK LINKS SECTION */}
      <section className="py-12 bg-white border-t">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/blog">
              <div className="group p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                <TrendingUp className="h-8 w-8 mb-3 opacity-80" />
                <h3 className="font-bold text-xl mb-1">Corporate Blog</h3>
                <p className="text-purple-100 text-sm">Latest insights & updates from the Indian corporate world</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold">Read now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
              </div>
            </Link>
            <Link href="/faq">
              <div className="group p-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                <Users className="h-8 w-8 mb-3 opacity-80" />
                <h3 className="font-bold text-xl mb-1">FAQ & Company Info</h3>
                <p className="text-cyan-100 text-sm">Common questions answered with real company data</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold">View FAQs <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
              </div>
            </Link>
            <a href="https://your-different-website.com" target="_blank" rel="noopener noreferrer">
              <div className="group p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                <Globe className="h-8 w-8 mb-3 opacity-80" />
                <h3 className="font-bold text-xl mb-1">Partner Website</h3>
                <p className="text-orange-100 text-sm">Explore our partner site for more business tools & resources</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold">Visit now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-7 w-7 text-orange-400" />
                <span className="text-xl font-bold font-display">IndiaCorp<span className="text-orange-400">DB</span></span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                India's most comprehensive corporate directory. Sourced from Ministry of Corporate Affairs (MCA).
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-slate-200">Quick Links</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Company Directory</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/admin" className="hover:text-white transition-colors">Admin Panel</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-slate-200">Countries</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                {COUNTRIES.map(c => (
                  <li key={c.name}>
                    <button
                      onClick={() => { handleCountryClick(c.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="hover:text-white transition-colors"
                    >
                      {c.flag} {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} IndiaCorpDB. All rights reserved.</p>
            <a
              href="https://your-different-website.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-orange-400 transition-colors font-medium"
            >
              <Globe className="h-4 w-4" />
              Visit our Partner Website
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
