import { useFaqs, useCompanies } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, HelpCircle, Building2 } from "lucide-react";

export default function FAQ() {
  const { data: faqs, isLoading: faqsLoading } = useFaqs();
  const { data: companiesData, isLoading: companiesLoading } = useCompanies({ page: 1, limit: 10 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 container-width">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-display">Frequently Asked Questions</h1>
            <p className="text-muted-foreground">Find answers to common questions about IndiaCorpDB.</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              General FAQ
            </h2>
            {faqsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !faqs || faqs.length === 0 ? (
              <div className="text-center py-10 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">No FAQs available yet.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
                    <AccordionTrigger className="text-left font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Company Data FAQ
            </h2>
            <p className="text-sm text-muted-foreground">Quick facts about some recently registered companies.</p>
            {companiesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !companiesData?.data || companiesData.data.length === 0 ? (
              <div className="text-center py-10 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">No company data available.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {companiesData.data.map((company) => (
                  <AccordionItem key={company.id} value={`co-${company.id}`}>
                    <AccordionTrigger className="text-left font-semibold">
                      What are the details for {company.name}?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2">
                      <p><strong>CIN:</strong> {company.cin}</p>
                      <p><strong>Status:</strong> {company.status}</p>
                      <p><strong>State:</strong> {company.state}</p>
                      <p><strong>Incorporation Date:</strong> {company.incorporationDate ? new Date(company.incorporationDate).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Address:</strong> {company.address}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
