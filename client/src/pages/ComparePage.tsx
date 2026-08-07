/**
 * Phase 15 — Company Comparison Page
 * URL: /compare?ids=1,2,3  (up to 3 companies)
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, ArrowLeft, Scale, CheckCircle2, XCircle } from "lucide-react";
import type { Company } from "@shared/schema";

const FIELDS: { key: keyof Company; label: string; format?: (v: any) => string }[] = [
  { key: "status",            label: "Status" },
  { key: "state",             label: "State" },
  { key: "city",              label: "City" },
  { key: "class",             label: "Class" },
  { key: "category",          label: "Category" },
  { key: "subCategory",       label: "Sub-category" },
  { key: "authorizedCapital", label: "Authorised Capital", format: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
  { key: "paidUpCapital",     label: "Paid-up Capital",   format: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
  { key: "incorporationDate", label: "Incorporation Date", format: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
  { key: "lastAgmDate",       label: "Last AGM",          format: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
  { key: "roc",               label: "ROC" },
  { key: "email",             label: "Email" },
  { key: "phone",             label: "Phone" },
];

function getIds(): number[] {
  const p = new URLSearchParams(window.location.search);
  return (p.get("ids") || "").split(",").map(Number).filter(Boolean).slice(0, 3);
}

export function removeFromCompare(id: number) {
  const ids = getIds().filter(x => x !== id);
  const url = ids.length ? `/compare?ids=${ids.join(",")}` : "/compare";
  window.history.pushState({}, "", url);
  window.dispatchEvent(new Event("comparechange"));
}

export default function ComparePage() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const update = () => setIds(getIds());
    update();
    window.addEventListener("comparechange", update);
    return () => window.removeEventListener("comparechange", update);
  }, []);

  const queries = ids.map(id => ({
    queryKey: ["/api/companies", id],
    queryFn: async (): Promise<Company> => {
      const res = await fetch(`/api/companies/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  }));

  const results = queries.map(q => useQuery(q));
  const companies = results.map(r => r.data).filter(Boolean) as Company[];
  const isLoading = results.some(r => r.isLoading);

  const statusColor = (s?: string | null) =>
    s?.toLowerCase() === "active" ? "text-green-600" : "text-red-500";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Compare Companies — AddressBay</title>
        <meta name="description" content="Compare up to 3 companies side by side on AddressBay." />
      </Helmet>
      <Navbar />

      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-12">
        <div className="container-width">
          <Link href="/"><button className="flex items-center gap-2 text-blue-300 hover:text-white text-sm mb-4 transition-colors"><ArrowLeft className="h-4 w-4" /> Back</button></Link>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-2xl p-3"><Scale className="h-8 w-8 text-blue-300" /></div>
            <div>
              <h1 className="text-3xl font-display font-bold">Company Comparison</h1>
              <p className="text-blue-200 text-sm mt-1">Side-by-side comparison of key business metrics</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-10 container-width">
        {ids.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Scale className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No companies selected</h3>
            <p className="text-muted-foreground mb-6">Use the "Compare" button on company profiles to add up to 3 companies here.</p>
            <Link href="/"><Button>Browse Directory</Button></Link>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${ids.length}, 1fr)` }}>
            {Array.from({ length: (ids.length + 1) * 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 pr-4 text-sm font-semibold text-muted-foreground w-44">Field</th>
                  {companies.map(c => (
                    <th key={c.id} className="py-3 px-4 text-left border-l">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-base leading-tight line-clamp-2">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.cin}</p>
                          <Link href={c.slug && c.countryCode ? `/${c.countryCode.toLowerCase()}/company/${c.slug}` : `/company/${c.id}`}>
                            <Badge className="mt-1 text-[10px] cursor-pointer hover:opacity-80">View Profile ↗</Badge>
                          </Link>
                        </div>
                        <button onClick={() => removeFromCompare(c.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map(f => (
                  <tr key={String(f.key)} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="py-3 pr-4 text-sm text-muted-foreground font-medium">{f.label}</td>
                    {companies.map(c => {
                      const raw = c[f.key];
                      const val = f.format ? f.format(raw) : (raw ?? "—");
                      return (
                        <td key={c.id} className={`py-3 px-4 text-sm border-l font-medium ${f.key === "status" ? statusColor(String(raw)) : ""}`}>
                          {String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {companies.length < 3 && (
              <div className="mt-6 border-2 border-dashed border-muted rounded-2xl p-8 text-center text-muted-foreground">
                <p className="text-sm">Add {3 - companies.length} more {3 - companies.length === 1 ? "company" : "companies"} to compare. Use the Compare button on any profile.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <BacklinkGrid />
    </div>
  );
}
