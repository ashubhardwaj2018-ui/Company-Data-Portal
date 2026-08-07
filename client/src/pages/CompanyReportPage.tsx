/**
 * Phase 32 — Print-Optimized Company Report
 * Clean single-page layout for printing/PDF. No navbar or sidebars.
 */
import { useRoute } from "wouter";
import { useCompany, useCompanyBySlug } from "@/hooks/use-companies";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { parseBadges } from "@/components/companies/BadgesDisplay";
import type { Company } from "@shared/schema";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 py-2.5 border-b border-slate-100 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="text-slate-900">{String(value)}</span>
    </div>
  );
}

function Report({ company }: { company: Company }) {
  const badges = parseBadges(company.badges);

  return (
    <>
      <Helmet>
        <title>Company Report — {company.name}</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        `}</style>
      </Helmet>

      <div className="max-w-3xl mx-auto px-8 py-10 font-sans text-slate-900">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-800">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AddressBay Company Report</div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            {company.cin && <div className="font-mono text-sm text-slate-500 mt-1">{company.cin}</div>}
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Generated: {format(new Date(), "dd MMM yyyy")}</div>
            <div className="mt-1 text-slate-600 font-semibold">{company.status || "—"}</div>
            {badges.length > 0 && (
              <div className="flex gap-1 mt-1 justify-end flex-wrap">
                {badges.map(b => <span key={b} className="text-[10px] border rounded px-1.5 py-0.5 font-bold uppercase">{b}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Company vitals */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-3">Registration Details</h2>
          <Field label="CIN / Registration No." value={company.cin || company.registrationNumber} />
          <Field label="Status" value={company.status} />
          <Field label="Class" value={company.class} />
          <Field label="Category" value={company.category} />
          <Field label="Sub-Category" value={company.subCategory} />
          <Field label="Country" value={company.country || company.countryCode} />
          <Field label="ROC Code" value={company.roc} />
          <Field label="Source" value={company.source} />
        </div>

        {/* Financials */}
        {(company.authorizedCapital || company.paidUpCapital) && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-3">Financials</h2>
            <Field label="Authorized Capital" value={company.authorizedCapital ? `₹ ${company.authorizedCapital.toLocaleString("en-IN")}` : undefined} />
            <Field label="Paid-Up Capital" value={company.paidUpCapital ? `₹ ${company.paidUpCapital.toLocaleString("en-IN")}` : undefined} />
          </div>
        )}

        {/* Dates */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-3">Key Dates</h2>
          <Field label="Date of Incorporation" value={company.incorporationDate ? format(new Date(company.incorporationDate), "dd MMMM yyyy") : undefined} />
          <Field label="Last AGM Date" value={company.lastAgmDate ? format(new Date(company.lastAgmDate), "dd MMMM yyyy") : undefined} />
          <Field label="Last Balance Sheet" value={company.lastBalanceSheetDate ? format(new Date(company.lastBalanceSheetDate), "dd MMMM yyyy") : undefined} />
        </div>

        {/* Contact & Address */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-3">Contact & Location</h2>
          <Field label="Registered Address" value={company.address} />
          <Field label="City" value={company.city} />
          <Field label="State / Province" value={company.state} />
          <Field label="Pincode" value={company.pincode} />
          <Field label="Email" value={company.email} />
          <Field label="Phone" value={company.phone} />
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-xs text-slate-400 flex justify-between">
          <span>Source: AddressBay Global Corporate Directory</span>
          <span className="no-print">
            <button onClick={() => window.print()}
              className="text-blue-600 underline font-medium">Print / Save PDF</button>
          </span>
          <span>Data sourced from official government registries</span>
        </div>
      </div>
    </>
  );
}

export default function CompanyReportPage() {
  const [matchSlug, paramsSlug] = useRoute("/:countryCode/company/:slug/report");
  const [matchId, paramsId] = useRoute("/company/:id/report");

  const { data: bySlug } = useCompanyBySlug(
    matchSlug ? (paramsSlug?.countryCode || "") : "",
    matchSlug ? (paramsSlug?.slug || "") : ""
  );
  const { data: byId } = useCompany(
    matchId ? Number(paramsId?.id) : 0
  );

  const company = bySlug || byId;

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return <Report company={company} />;
}
