/**
 * Phase 17 — User Profile Page
 * Shows the authenticated user's watchlist, claims, and suggestions in one view.
 */
import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bookmark, ShieldAlert, AlertTriangle, LogIn, Building2, Search, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  approved:  "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-700",
  applied:   "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: watchlist, isLoading: wLoading } = useQuery<{ data: Company[]; total: number }>({
    queryKey: ["/api/watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist?limit=50", { credentials: "include" });
      if (!res.ok) return { data: [], total: 0 };
      return res.json();
    },
    enabled: !!user,
  });

  const { data: claims = [], isLoading: cLoading } = useQuery<any[]>({
    queryKey: ["/api/my/claims"],
    queryFn: async () => {
      const res = await fetch("/api/my/claims", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: suggestions = [], isLoading: sLoading } = useQuery<any[]>({
    queryKey: ["/api/my/suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/my/suggestions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: savedSearches = [], isLoading: ssLoading } = useQuery<any[]>({
    queryKey: ["/api/my/searches"],
    queryFn: async () => {
      const res = await fetch("/api/my/searches", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { toast } = useToast();

  const deleteSearch = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/my/searches/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/my/searches"] }),
    onError: () => toast({ title: "Could not delete search", variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet><title>My Profile — AddressBay</title></Helmet>
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <LogIn className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">Sign in to view your profile</h3>
            <p className="text-muted-foreground mb-6">Access your saved companies, claims and suggestions.</p>
            <a href="/api/login"><Button>Sign In</Button></a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = [user.firstName, user.lastName].filter(Boolean).map((n: any) => n[0]).join("") || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Profile — AddressBay</title>
        <meta name="description" content="Your AddressBay activity — watchlist, claims and correction history." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Navbar />

      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-14">
        <div className="container-width flex items-center gap-5">
          <div className="h-18 w-18 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-3xl font-bold">
            {user.profileImageUrl
              ? <img src={user.profileImageUrl} className="h-16 w-16 rounded-full object-cover" alt="avatar" />
              : <span className="text-white">{initials}</span>
            }
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-blue-200 text-sm mt-1">{user.email}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-blue-300">{watchlist?.total ?? 0} saved</span>
              <span className="text-xs text-blue-300">{claims.length} claims</span>
              <span className="text-xs text-blue-300">{suggestions.length} suggestions</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-10 container-width">
        <Tabs defaultValue="watchlist">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="watchlist" className="gap-2"><Bookmark className="h-4 w-4" /> Watchlist ({watchlist?.total ?? 0})</TabsTrigger>
            <TabsTrigger value="searches" className="gap-2"><Search className="h-4 w-4" /> Saved Searches ({savedSearches.length})</TabsTrigger>
            <TabsTrigger value="claims" className="gap-2"><ShieldAlert className="h-4 w-4" /> Claims ({claims.length})</TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2"><AlertTriangle className="h-4 w-4" /> Corrections ({suggestions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist">
            {wLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
              </div>
            ) : !watchlist?.data.length ? (
              <div className="text-center py-16 border rounded-2xl bg-muted/20">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-semibold mb-1">No saved companies yet</p>
                <p className="text-muted-foreground text-sm mb-4">Click the bookmark icon on any company profile.</p>
                <Link href="/"><Button variant="outline" size="sm">Browse Directory</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {watchlist.data.map(c => <CompanyCard key={c.id} company={c} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="searches">
            {ssLoading ? <Skeleton className="h-32 rounded-xl" /> : !savedSearches.length ? (
              <div className="text-center py-16 border rounded-2xl bg-muted/20">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-semibold mb-1">No saved searches yet</p>
                <p className="text-muted-foreground text-sm">Use the "Save Search" button on the directory to save a filter combination.</p>
                <Link href="/"><button className="mt-4 text-primary text-sm font-medium underline underline-offset-2">Go to Directory</button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSearches.map((s: any) => {
                  let filters: Record<string, any> = {};
                  try { filters = JSON.parse(s.filters); } catch {}
                  const paramStr = Object.entries(filters)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("&");
                  return (
                    <div key={s.id} className="border rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{paramStr || "All companies"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/?${paramStr}`}>
                          <button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Run</button>
                        </Link>
                        <button
                          onClick={() => deleteSearch.mutate(s.id)}
                          disabled={deleteSearch.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg border text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims">
            {cLoading ? <Skeleton className="h-32 rounded-xl" /> : !claims.length ? (
              <div className="text-center py-16 border rounded-2xl bg-muted/20">
                <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-semibold mb-1">No claims submitted yet</p>
                <p className="text-muted-foreground text-sm">Claim a business listing to manage its profile.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((c: any) => (
                  <div key={c.id} className="border rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="font-semibold">{c.companyName || `Company #${c.companyId}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                      {c.message && <p className="text-sm mt-1 text-muted-foreground line-clamp-1">"{c.message}"</p>}
                    </div>
                    <Badge className={`shrink-0 text-xs border-0 ${STATUS_STYLE[c.status] || "bg-gray-100"}`}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions">
            {sLoading ? <Skeleton className="h-32 rounded-xl" /> : !suggestions.length ? (
              <div className="text-center py-16 border rounded-2xl bg-muted/20">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-semibold mb-1">No corrections submitted yet</p>
                <p className="text-muted-foreground text-sm">Use "Suggest Correction" on any company profile to flag stale data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s: any) => (
                  <div key={s.id} className="border rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="font-semibold">{s.companyName || `Company #${s.companyId}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.fieldName} → <span className="text-green-700 font-medium">{s.suggestedValue}</span></p>
                      {s.reason && <p className="text-sm mt-1 text-muted-foreground line-clamp-1">{s.reason}</p>}
                    </div>
                    <Badge className={`shrink-0 text-xs border-0 ${STATUS_STYLE[s.status] || "bg-gray-100"}`}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
