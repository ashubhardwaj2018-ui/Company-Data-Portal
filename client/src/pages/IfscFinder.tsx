/**
 * Public Indian Bank IFSC code finder — search by IFSC, bank, branch, or city.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IfscCode } from "@shared/schema";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Landmark, MapPin, Loader2, Search, Copy, Check } from "lucide-react";

const LIMIT = 20;

function CopyIfsc({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      data-testid={`button-copy-${code}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function IfscFinder() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: IfscCode[]; total: number }>({
    queryKey: ["/api/ifsc", { page, limit: LIMIT, search: query }],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (query) p.set("search", query);
      const res = await fetch(`/api/ifsc?${p}`);
      return res.json();
    },
    placeholderData: prev => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Bank IFSC Code Finder — AddressBay</title>
        <meta name="description" content="Find Indian bank branch IFSC codes — search by IFSC, bank name, branch, or city and get the full branch address." />
      </Helmet>
      <Navbar />

      <div className="bg-slate-900 text-white py-12">
        <div className="container-width text-center space-y-4">
          <h1 className="text-3xl font-bold font-display" data-testid="text-ifsc-title">Bank IFSC Code Finder</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">
            Look up Indian bank branch IFSC codes with full branch details.
          </p>
          <form
            className="max-w-lg mx-auto flex gap-2"
            onSubmit={e => { e.preventDefault(); setQuery(search); setPage(1); }}
          >
            <Input
              className="bg-white text-slate-900"
              placeholder="Search IFSC, bank, branch, or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-ifsc-search"
            />
            <Button type="submit" data-testid="button-ifsc-search"><Search className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>

      <main className="flex-1 py-10 container-width">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !data?.data.length ? (
          <div className="text-center py-16 space-y-2">
            <Landmark className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-medium">{query ? `No IFSC records found for "${query}".` : "No IFSC records available yet."}</p>
            <p className="text-xs text-slate-400">Bank branch data is being added — check back soon.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4" data-testid="text-ifsc-count">{data.total} branch{data.total === 1 ? "" : "es"} found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.data.map(r => (
                <div key={r.id} className="ab-card p-5 space-y-2.5" data-testid={`card-ifsc-${r.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-900 text-sm">{r.bank}</h2>
                      {r.branch && <p className="text-xs text-slate-500">{r.branch} branch</p>}
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-bold text-primary" data-testid={`text-ifsc-code-${r.id}`}>{r.ifsc}</span>
                      <CopyIfsc code={r.ifsc} />
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {(r.city || r.district || r.state) && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-rose-400" />
                        {[r.city, r.district, r.state].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).join(", ")}
                      </p>
                    )}
                    {r.address && <p className="text-slate-400 leading-relaxed">{r.address}</p>}
                  </div>
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
