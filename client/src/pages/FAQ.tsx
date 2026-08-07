import { useFaqs, useCompanies } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Loader2, HelpCircle, Building2, MapPin, Calendar, IndianRupee, ArrowRight } from "lucide-react";

export default function FAQ() {
  const { data: faqs, isLoading: faqsLoading } = useFaqs();
  const { data: companiesData, isLoading: companiesLoading } = useCompanies({ page: 1, limit: 12 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-slate-900 text-white py-12">
        <div className="container-width text-center space-y-3">
          <h1 className="text-3xl font-bold">FAQ &amp; Company Information</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">Browse common questions and explore real company data from our directory.</p>
        </div>
      </div>

      <main className="flex-1 py-12 container-width">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left: General FAQs */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2 sticky top-20">
              <HelpCircle className="h-6 w-6 text-primary" />
              General FAQ
            </h2>
            {faqsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !faqs || faqs.length === 0 ? (
              <div className="text-center py-10 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">No FAQs available yet.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
                    <AccordionTrigger className="text-left font-semibold text-sm">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm whitespace-pre-wrap">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* Right: Company Data FAQ */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Company Information
            </h2>
            <p className="text-sm text-muted-foreground -mt-4">
              Real data from our directory — click any company to see full details.
            </p>

            {companiesLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !companiesData?.data || companiesData.data.length === 0 ? (
              <div className="text-center py-10 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">No company data available.</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-2">
                {companiesData.data.map((company) => {
                  const statusColor =
                    company.status?.toLowerCase().includes("active")
                      ? "bg-green-100 text-green-700"
                      : company.status?.toLowerCase().includes("strike")
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700";
                  return (
                    <AccordionItem
                      key={company.id}
                      value={`co-${company.id}`}
                      className="border rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 text-left">
                        <div className="flex flex-wrap items-center gap-3 w-full pr-4">
                          <span className="text-2xl">🏢</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{company.name}</p>
                            {company.cin && (
                              <p className="text-xs font-mono text-muted-foreground">{company.cin}</p>
                            )}
                          </div>
                          <Badge className={`${statusColor} border-0 shrink-0 text-xs`}>
                            {company.status || "Unknown"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 bg-slate-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-3">
                            <FaqDataRow icon={<Building2 className="h-4 w-4" />} label="Class / Category" value={`${company.class || '—'} · ${company.category || '—'}`} />
                            <FaqDataRow icon={<MapPin className="h-4 w-4" />} label="Location" value={[company.city, company.state, company.country].filter(Boolean).join(', ') || '—'} />
                            <FaqDataRow icon={<Calendar className="h-4 w-4" />} label="Incorporated" value={company.incorporationDate ? new Date(company.incorporationDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                          </div>
                          <div className="space-y-3">
                            <FaqDataRow icon={<IndianRupee className="h-4 w-4" />} label="Authorised Capital" value={company.authorizedCapital ? `₹ ${company.authorizedCapital.toLocaleString('en-IN')}` : '—'} />
                            <FaqDataRow icon={<IndianRupee className="h-4 w-4" />} label="Paid-up Capital" value={company.paidUpCapital ? `₹ ${company.paidUpCapital.toLocaleString('en-IN')}` : '—'} />
                            {company.roc && <FaqDataRow icon={<Building2 className="h-4 w-4" />} label="ROC Code" value={company.roc} />}
                          </div>
                        </div>
                        {company.address && (
                          <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
                            📍 {company.address}
                          </p>
                        )}
                        <div className="mt-4">
                          <Link href={`/company/${company.id}`}>
                            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
                              View full company profile <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FaqDataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
