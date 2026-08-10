import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";
import type { ReactNode } from "react";

/** Shared layout for legal/static pages (Privacy, Terms, Disclaimer, Contact). */
export function LegalPage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{title} — AddressBay</title>
        <meta name="description" content={subtitle} />
      </Helmet>
      <Navbar />

      <div className="bg-slate-900 text-white py-12">
        <div className="container-width text-center space-y-3">
          <h1 className="text-3xl font-bold font-display" data-testid="text-legal-title">{title}</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">{subtitle}</p>
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        <div className="max-w-3xl mx-auto space-y-8 text-sm leading-relaxed text-slate-600 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
