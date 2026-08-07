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
import { CompanyCardSkeleton } from "@/components/companies/CompanyCardSkeleton";
import { ArrowLeft, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import type { Company } from "@shared/schema";

function fromSlug(s: string) {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function IndustryPage() {
  const [, params] = useRoute("/industry/:slug");
  const industrySlug = params?.slug || "";
  const industryName = fromSlug(industrySlug);
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data, isLoading } = useQuery<{ data: Company[]; total: number }>({
    queryKey: ["/api/companies", { industry: industryName, page, limit: LIMIT }],
    queryFn: async () => {
      const p = new URLSearchParams({ industry: industryName, page: String(page), limit: String(LIMIT) });
      const res = await fetch(`/api/companies?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const title = `${industryName} Companies — AddressBay`;
  const desc = `Browse ${data?.total?.toLocaleString() ?? ""} companies in the ${industryName} industry. Find contact details and registration data.`;

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

      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-14">
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

      <div className="bg-muted/30 border-b py-2 text-xs text-muted-foreground">
        <div className="container-width flex gap-1">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{industryName}</span>
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CompanyCardSkeleton key={i} />)}
          </div>
        ) : !data?.data.length ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Briefcase className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No companies found for "{industryName}"</h3>
            <p className="text-muted-foreground mb-6">This industry may not have companies in the current dataset.</p>
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
