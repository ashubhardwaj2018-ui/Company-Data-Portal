/**
 * Phase 14 — Data correction suggestion modal.
 * Lets authenticated users flag stale or incorrect company data.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X, CheckCircle2 } from "lucide-react";

const COMPANY_FIELDS = [
  { value: "name",             label: "Company Name" },
  { value: "email",            label: "Email Address" },
  { value: "phone",            label: "Phone Number" },
  { value: "address",          label: "Registered Address" },
  { value: "city",             label: "City" },
  { value: "state",            label: "State" },
  { value: "pincode",          label: "Pincode" },
  { value: "status",           label: "Company Status" },
  { value: "incorporationDate",label: "Incorporation Date" },
  { value: "other",            label: "Other" },
];

interface Props {
  companyId: number;
  companyName: string;
  isLoggedIn: boolean;
  currentValues?: Record<string, string | null | undefined>;
}

export function SuggestCorrectionModal({ companyId, companyName, isLoggedIn, currentValues = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [field, setField] = useState(COMPANY_FIELDS[0].value);
  const [suggestedValue, setSuggestedValue] = useState("");
  const [reason, setReason] = useState("");

  const currentValue = String(currentValues[field] ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fieldName: field, currentValue, suggestedValue, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-500 hover:text-orange-600"
        onClick={() => setOpen(true)}>
        <AlertTriangle className="h-3.5 w-3.5" /> Suggest Correction
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-xl">Thank You!</h3>
            <p className="text-muted-foreground text-sm">
              Your correction for <strong>{companyName}</strong> has been submitted and will be reviewed by our team.
            </p>
            <Button onClick={() => { setOpen(false); setDone(false); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-orange-100 rounded-xl p-2">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Suggest a Correction</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{companyName}</p>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                You must be <a href="/api/login" className="underline font-medium">logged in</a> to suggest corrections.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Field to correct *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={field}
                  onChange={e => { setField(e.target.value); setSuggestedValue(""); }}
                  disabled={!isLoggedIn}
                >
                  {COMPANY_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              {currentValue && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Current value (for reference)</label>
                  <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 border text-slate-600">{currentValue}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct value *</label>
                <Input
                  placeholder="Enter the correct value"
                  value={suggestedValue}
                  onChange={e => setSuggestedValue(e.target.value)}
                  disabled={!isLoggedIn}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Source / reason (optional)</label>
                <Textarea
                  placeholder="e.g. Official website, MCA portal, company documents..."
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={!isLoggedIn}
                />
              </div>
            </div>

            {mutation.isError && (
              <p className="text-xs text-destructive mt-2">{(mutation.error as Error).message}</p>
            )}

            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!isLoggedIn || !suggestedValue.trim() || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
