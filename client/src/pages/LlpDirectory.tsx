/**
 * Public Indian LLP directory — searchable, paginated list.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Llp } from "@shared/schema";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, Loader2, Search } from "lucide-react";
import { LlpCard } from "@/components/llps/LlpCard";

const LIMIT = 20;

export default function LlpDirectory() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: Llp[]; total: number }>({
    queryKey: ["/api/llps", { page, limit: LIMIT, search: query }],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (query) p.set("search", query);
      const res = await fetch(`/api/llps?${p}`);
      return res.json();
    },
    placeholderData: prev => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Indian LLP Directory — AddressBay</title>
        <meta name="description" content="Search Indian Limited Liability Partnerships (LLPs) by name or LLPIN — registration details, ROC, status, and registered address." />
      </Helmet>
      <Navbar />

      <div className="bg-slate-900 text-white py-12">
        <div className="container-width text-center space-y-4">
          <h1 className="text-3xl font-bold font-display" data-testid="text-llp-title">Indian LLP Directory</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">
            Search Limited Liability Partnerships registered with the Ministry of Corporate Affairs.
          </p>
          <form
            className="max-w-lg mx-auto flex gap-2"
            onSubmit={e => { e.preventDefault(); setQuery(search); setPage(1); }}
          >
            <Input
              className="bg-white text-slate-900"
              placeholder="Search by LLP name or LLPIN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-llp-search"
            />
            <Button type="submit" data-testid="button-llp-search"><Search className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>

      <main className="flex-1 py-10 container-width">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !data?.data.length ? (
          <div className="text-center py-16 space-y-2">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-medium">{query ? `No LLPs found for "${query}".` : "No LLP records available yet."}</p>
            <p className="text-xs text-slate-400">LLP data is being added — check back soon.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4" data-testid="text-llp-count">{data.total} LLP{data.total === 1 ? "" : "s"} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map(l => (
                <LlpCard key={l.id} llp={l} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 text-sm">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-slate-500">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
