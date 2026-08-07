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
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bookmark, ShieldAlert, AlertTriangle, LogIn, Building2 } from "lucide-react";
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
        <BacklinkGrid />
      </div>
    );
  }

  const initials = [user.firstName, user.lastName].filter(Boolean).map((n: any) => n[0]).join("") || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Profile — AddressBay</title>
        <meta name="description" content="Your AddressBay activity — watchlist, claims and correction history." />
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
          <TabsList className="mb-6">
            <TabsTrigger value="watchlist" className="gap-2"><Bookmark className="h-4 w-4" /> Watchlist ({watchlist?.total ?? 0})</TabsTrigger>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {watchlist.data.map(c => <CompanyCard key={c.id} company={c} />)}
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
      <BacklinkGrid />
    </div>
  );
}
