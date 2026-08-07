/**
 * Phase 19 — Company Reviews & Star Ratings
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: number;
  userEmail: string;
  userName?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

function StarRating({ value, onChange, readOnly = false, size = "md" }: {
  value: number; onChange?: (v: number) => void; readOnly?: boolean; size?: "sm" | "md"
}) {
  const [hovered, setHovered] = useState(0);
  const dim = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(i)}
          onMouseEnter={() => !readOnly && setHovered(i)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
        >
          <Star className={`${dim} transition-colors ${
            i <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`} />
        </button>
      ))}
    </div>
  );
}

function AverageRating({ avg, total }: { avg: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">{avg > 0 ? avg.toFixed(1) : "—"}</span>
      <div>
        <StarRating value={Math.round(avg)} readOnly size="sm" />
        <p className="text-xs text-muted-foreground mt-0.5">{total} {total === 1 ? "review" : "reviews"}</p>
      </div>
    </div>
  );
}

interface Props {
  companyId: number;
  isLoggedIn: boolean;
  userEmail?: string;
}

export function ReviewsSection({ companyId, isLoggedIn, userEmail }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");

  const { data: reviewData } = useQuery<{ reviews: Review[]; avg: number; total: number }>({
    queryKey: ["/api/companies/reviews", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/reviews`);
      if (!res.ok) return { reviews: [], avg: 0, total: 0 };
      return res.json();
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, comment, userName: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/reviews", companyId] });
      setShowForm(false); setRating(0); setComment(""); setName("");
      toast({ title: "Review submitted! It will appear after moderation." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reviews = reviewData?.reviews || [];
  const avg = reviewData?.avg || 0;
  const total = reviewData?.total || 0;

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">Reviews & Ratings</h3>
        </div>
        {total > 0 && <AverageRating avg={avg} total={total} />}
      </div>

      {/* Write review */}
      {isLoggedIn && !showForm && (
        <Button variant="outline" size="sm" className="mb-6" onClick={() => setShowForm(true)}>
          <Star className="h-4 w-4 mr-2" /> Write a Review
        </Button>
      )}
      {!isLoggedIn && (
        <p className="text-sm text-muted-foreground mb-4">
          <a href="/api/login" className="text-primary underline">Sign in</a> to leave a review.
        </p>
      )}

      {showForm && (
        <div className="border rounded-2xl p-5 mb-6 bg-muted/20 space-y-3">
          <p className="font-semibold text-sm">Your rating *</p>
          <StarRating value={rating} onChange={setRating} />
          <Input placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
          <Textarea placeholder="Share your experience with this company (optional)" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
          {submitReview.error && <p className="text-xs text-destructive">{(submitReview.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" disabled={rating === 0 || submitReview.isPending} onClick={() => submitReview.mutate()}>
              {submitReview.isPending ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No approved reviews yet. Be the first to share your experience!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border rounded-xl p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} readOnly size="sm" />
                    {r.userName && <span className="text-sm font-medium">{r.userName}</span>}
                  </div>
                  {r.comment && <p className="text-sm mt-2 text-foreground/80">{r.comment}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
