/**
 * Phase 16 — Newsletter signup widget
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const subscribe = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  return (
    <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t py-12">
      <div className="container-width max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Stay Updated</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Get notified about new company data, industry updates, and directory features.
        </p>
        {done ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
            <CheckCircle2 className="h-5 w-5" /> You're subscribed! Thank you.
          </div>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            onSubmit={e => { e.preventDefault(); if (email) subscribe.mutate(); }}
          >
            <Input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="email"
              placeholder="Your email *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={!email || subscribe.isPending} className="shrink-0">
              {subscribe.isPending ? "…" : "Subscribe"}
            </Button>
          </form>
        )}
        {subscribe.isError && (
          <p className="text-xs text-destructive mt-2">{(subscribe.error as Error).message}</p>
        )}
      </div>
    </section>
  );
}
