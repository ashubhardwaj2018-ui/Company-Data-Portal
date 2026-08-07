/**
 * Phase 11 — Watchlist (bookmark) button for company profiles.
 * Toggles saved state, requires auth.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  companyId: number;
  isLoggedIn: boolean;
}

export function WatchlistButton({ companyId, isLoggedIn }: Props) {
  const { toast } = useToast();

  const { data: saved, isLoading } = useQuery<{ saved: boolean }>({
    queryKey: ["/api/watchlist/check", companyId],
    queryFn: async () => {
      if (!isLoggedIn) return { saved: false };
      const res = await fetch(`/api/watchlist/check/${companyId}`, { credentials: "include" });
      if (!res.ok) return { saved: false };
      return res.json();
    },
    enabled: isLoggedIn,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!isLoggedIn) { window.location.href = "/api/login"; return; }
      const method = saved?.saved ? "DELETE" : "POST";
      const res = await fetch(`/api/watchlist/${companyId}`, { method, credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/check", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: saved?.saved ? "Removed from watchlist" : "Saved to watchlist" });
    },
    onError: () => toast({ title: "Error updating watchlist", variant: "destructive" }),
  });

  if (!isLoggedIn) {
    return (
      <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-600 hover:bg-slate-50"
        onClick={() => window.location.href = "/api/login"}>
        <Bookmark className="h-4 w-4" /> Save
      </Button>
    );
  }

  if (isLoading) {
    return <Button variant="outline" size="sm" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  }

  return (
    <Button
      variant={saved?.saved ? "default" : "outline"}
      size="sm"
      className={`gap-2 ${saved?.saved ? "bg-blue-600 text-white hover:bg-blue-700 border-0" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
    >
      {toggleMutation.isPending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : saved?.saved
          ? <><BookmarkCheck className="h-4 w-4" /> Saved</>
          : <><Bookmark className="h-4 w-4" /> Save</>
      }
    </Button>
  );
}
