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
import { Briefcase, MapPin, Calendar, Loader2, Search, FileText } from "lucide-react";
import { format } from "date-fns";

const LIMIT = 20;

function fmtDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : format(dt, "d MMM yyyy");
}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.data.map(l => (
                <div key={l.id} className="ab-card p-5 space-y-2.5" data-testid={`card-llp-${l.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-slate-900 text-sm">{l.name}</h2>
                    {l.status && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        /active/i.test(l.status) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>{l.status}</span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {l.llpin && <p className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-indigo-400" /> LLPIN: <span className="font-mono text-slate-700">{l.llpin}</span></p>}
                    {(l.district || l.state) && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-rose-400" /> {[l.district, l.state].filter(Boolean).join(", ")}</p>}
                    {fmtDate(l.registrationDate) && <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-amber-500" /> Registered {fmtDate(l.registrationDate)}{l.roc ? ` · ${l.roc}` : ""}</p>}
                    {l.industry && <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-violet-400" /> {l.industry}</p>}
                  </div>
                  {l.address && <p className="text-xs text-slate-400 leading-relaxed">{l.address}</p>}
                </div>
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
