/**
 * Phase 7 — Claim This Business modal
 * Lets authenticated users submit a claim for a company listing.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, X, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  companyId: number;
  companyName: string;
  isLoggedIn: boolean;
}

export function ClaimModal({ companyId, companyName, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userName: "", phone: "", message: "" });
  const [done, setDone] = useState(false);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to submit claim");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        <ShieldCheck className="h-4 w-4" /> Claim This Business
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-xl">Claim Submitted!</h3>
            <p className="text-muted-foreground text-sm">
              Our team will review your request and verify your ownership of{" "}
              <strong>{companyName}</strong> within 2–3 business days.
            </p>
            <Button onClick={() => { setOpen(false); setDone(false); }} className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-100 rounded-xl p-2">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Claim This Business</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{companyName}</p>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>You must be <a href="/api/login" className="underline font-medium">logged in</a> to claim a listing.</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name *</label>
                <Input
                  placeholder="Full name"
                  value={form.userName}
                  onChange={e => setForm(f => ({ ...f, userName: e.target.value }))}
                  disabled={!isLoggedIn}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Number</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  disabled={!isLoggedIn}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Why are you claiming this listing?</label>
                <Textarea
                  placeholder="E.g. I am the authorized representative / Director of this company..."
                  rows={3}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  disabled={!isLoggedIn}
                />
              </div>
            </div>

            {claimMutation.isError && (
              <p className="text-xs text-destructive mt-2">{(claimMutation.error as Error).message}</p>
            )}

            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!isLoggedIn || !form.userName.trim() || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
              >
                {claimMutation.isPending ? "Submitting…" : "Submit Claim"}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Verification may take 2–3 business days. We may contact you to confirm ownership.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
