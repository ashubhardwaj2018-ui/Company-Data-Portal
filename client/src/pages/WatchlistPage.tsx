import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Building2, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import type { Company } from "@shared/schema";

export default function WatchlistPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data, isLoading } = useQuery<{ data: Company[]; total: number }>({
    queryKey: ["/api/watchlist", page],
    queryFn: async () => {
      const res = await fetch(`/api/watchlist?page=${page}&limit=${LIMIT}`, { credentials: "include" });
      if (!res.ok) return { data: [], total: 0 };
      return res.json();
    },
    enabled: !!user,
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Watchlist — AddressBay</title>
        <meta name="description" content="Your saved companies on AddressBay." />
      </Helmet>
      <Navbar />

      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-14">
        <div className="container-width">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <Bookmark className="h-10 w-10 text-blue-300" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold">My Watchlist</h1>
              <p className="text-blue-200 mt-2">Companies you've saved for quick access</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        {!user ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <LogIn className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">Sign in to view your watchlist</h3>
            <p className="text-muted-foreground mb-6">Create a free account to save and track companies.</p>
            <a href="/api/login">
              <Button>Sign In</Button>
            </a>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        ) : !data?.data.length ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <Building2 className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-6">
              Click the bookmark icon on any company profile to save it here.
            </p>
            <Link href="/"><Button variant="outline">Browse Directory</Button></Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{data.total} saved {data.total === 1 ? "company" : "companies"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {data.data.map(c => <CompanyCard key={c.id} company={c} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
