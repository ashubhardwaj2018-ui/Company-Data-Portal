import { useRoute, Link } from "wouter";
import { useCompany, useCompanyBySlug, useRelatedCompanies } from "@/hooks/use-companies";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, MapPin, Calendar, FileText,
  Mail, IndianRupee, ArrowLeft, HelpCircle, Phone, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ShareBar } from "@/components/layout/ShareBar";
import { ServiceAside } from "@/components/layout/ServiceAside";
import type { Company } from "@shared/schema";

// ── Country code → display name ───────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", AU: "Australia", GB: "United Kingdom", SG: "Singapore",
};

// ── Canonical URL builder ─────────────────────────────────────────────────────
function canonicalUrl(company: Company): string {
  if (company.slug && company.countryCode) {
    return `/${company.countryCode.toLowerCase()}/company/${company.slug}`;
  }
  return `/company/${company.id}`;
}

// ── Country-specific field sections ──────────────────────────────────────────

function IndiaFields({ company }: { company: Company }) {
  return (
    <>
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" /> Company Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
          <InfoItem label="CIN" value={company.cin} />
          <InfoItem label="Class" value={company.class} />
          <InfoItem label="Category" value={company.category} />
          <InfoItem label="Sub-Category" value={company.subCategory} />
          <InfoItem label="ROC Code" value={company.roc} />
          <InfoItem label="Source" value={company.source} />
          <InfoItem
            label="Date of Incorporation"
            value={company.incorporationDate ? format(new Date(company.incorporationDate), "MMMM dd, yyyy") : undefined}
            icon={<Calendar className="h-4 w-4" />}
          />
          <InfoItem
            label="Authorized Capital"
            value={company.authorizedCapital ? `₹ ${company.authorizedCapital.toLocaleString("en-IN")}` : undefined}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <InfoItem
            label="Paid-up Capital"
            value={company.paidUpCapital ? `₹ ${company.paidUpCapital.toLocaleString("en-IN")}` : undefined}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          {company.industry && <InfoItem label="Industry" value={company.industry} />}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" /> Listing &amp; Annual Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
          <InfoItem
            label="Last AGM Date"
            value={company.lastAgmDate ? format(new Date(company.lastAgmDate), "MMMM dd, yyyy") : undefined}
          />
          <InfoItem
            label="Last Balance Sheet Date"
            value={company.lastBalanceSheetDate ? format(new Date(company.lastBalanceSheetDate), "MMMM dd, yyyy") : undefined}
          />
        </CardContent>
      </Card>
    </>
  );
}

function GlobalFields({ company }: { company: Company }) {
  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="h-5 w-5 text-primary" /> Company Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
        <InfoItem label="Registration Number" value={company.registrationNumber} />
        <InfoItem label="Status" value={company.status} />
        {company.industry && <InfoItem label="Industry" value={company.industry} />}
        <InfoItem
          label="Date of Incorporation"
          value={company.incorporationDate ? format(new Date(company.incorporationDate), "MMMM dd, yyyy") : undefined}
          icon={<Calendar className="h-4 w-4" />}
        />
        <InfoItem label="Source" value={company.source} />
      </CardContent>
    </Card>
  );
}

function CompanyFaqSection({ company }: { company: Company }) {
  const isIndia = company.countryCode === "IN";
  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-xl">
          <HelpCircle className="h-5 w-5 text-primary" /> Company Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="overview">
            <AccordionTrigger className="font-semibold">What type of company is {company.name}?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-1 text-sm">
              {isIndia && <>
                <p><strong>Class:</strong> {company.class || "N/A"}</p>
                <p><strong>Category:</strong> {company.category || "N/A"}</p>
                <p><strong>Sub-Category:</strong> {company.subCategory || "N/A"}</p>
              </>}
              <p><strong>Status:</strong> {company.status || "N/A"}</p>
              {company.industry && <p><strong>Industry:</strong> {company.industry}</p>}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="registration">
            <AccordionTrigger className="font-semibold">When was {company.name} incorporated?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-1 text-sm">
              {isIndia
                ? <p><strong>CIN:</strong> {company.cin || "N/A"}</p>
                : <p><strong>Registration Number:</strong> {company.registrationNumber || "N/A"}</p>}
              <p><strong>Date of Incorporation:</strong> {company.incorporationDate
                ? new Date(company.incorporationDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                : "N/A"}</p>
              {isIndia && <p><strong>ROC:</strong> {company.roc || "N/A"}</p>}
            </AccordionContent>
          </AccordionItem>
          {isIndia && (
            <AccordionItem value="capital">
              <AccordionTrigger className="font-semibold">What is the capital structure of {company.name}?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                <p><strong>Authorised Capital:</strong> {company.authorizedCapital ? `₹ ${company.authorizedCapital.toLocaleString("en-IN")}` : "N/A"}</p>
                <p><strong>Paid-up Capital:</strong> {company.paidUpCapital ? `₹ ${company.paidUpCapital.toLocaleString("en-IN")}` : "N/A"}</p>
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="location">
            <AccordionTrigger className="font-semibold">Where is {company.name} located?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-1 text-sm">
              <p><strong>Address:</strong> {company.address || "N/A"}</p>
              {company.district && <p><strong>District:</strong> {company.district}</p>}
              <p><strong>City:</strong> {company.city || "N/A"}</p>
              <p><strong>State:</strong> {company.state || "N/A"}</p>
              <p><strong>Pincode:</strong> {company.pincode || "N/A"}</p>
              <p><strong>Country:</strong> {COUNTRY_NAMES[company.countryCode || "IN"] || company.country || "India"}</p>
            </AccordionContent>
          </AccordionItem>
          {isIndia && (
            <AccordionItem value="compliance">
              <AccordionTrigger className="font-semibold">What is the compliance status of {company.name}?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                <p><strong>Last AGM Date:</strong> {company.lastAgmDate
                  ? new Date(company.lastAgmDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                  : "N/A"}</p>
                <p><strong>Last Balance Sheet Date:</strong> {company.lastBalanceSheetDate
                  ? new Date(company.lastBalanceSheetDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                  : "N/A"}</p>
              </AccordionContent>
            </AccordionItem>
          )}
          {company.customQna && (
            <AccordionItem value="custom">
              <AccordionTrigger className="font-semibold">Additional Information about {company.name}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm whitespace-pre-wrap">
                {company.customQna}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ── Related Companies section ─────────────────────────────────────────────────
function RelatedCompanies({ company }: { company: Company }) {
  const { data: related = [] } = useRelatedCompanies(company.id);
  if (!related.length) return null;
  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <CardTitle className="text-lg">
          {company.state ? `More Companies in ${company.state}` : "Related Companies"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="divide-y">
          {related.map(c => (
            <Link key={c.id} href={canonicalUrl(c)}
              className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded transition-colors group">
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.city}{c.city && c.state ? ", " : ""}{c.state}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {c.status && (
                  <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
        {/* Internal geographic links */}
        <div className="pt-3 border-t mt-2 flex flex-wrap gap-2">
          {company.state && (
            <Link href={`/?state=${encodeURIComponent(company.state)}&countryCode=${company.countryCode || "IN"}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted text-xs">
                Companies in {company.state}
              </Badge>
            </Link>
          )}
          {company.city && (
            <Link href={`/?search=${encodeURIComponent(company.city)}&countryCode=${company.countryCode || "IN"}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted text-xs">
                Companies in {company.city}
              </Badge>
            </Link>
          )}
          {company.roc && (
            <Link href={`/?search=${encodeURIComponent(company.roc)}&countryCode=${company.countryCode || "IN"}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted text-xs">
                ROC: {company.roc}
              </Badge>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompanyDetails() {
  // Match both route patterns
  const [matchById, paramsById] = useRoute("/company/:id");
  const [matchBySlug, paramsBySlug] = useRoute("/:countryCode/company/:slug");

  // Fetch by ID (legacy)
  const numericId = matchById ? parseInt(paramsById?.id || "0") : 0;
  const byId = useCompany(numericId);

  // Fetch by slug (new)
  const slugCountry = matchBySlug ? (paramsBySlug?.countryCode || "") : "";
  const slug = matchBySlug ? (paramsBySlug?.slug || "") : "";
  const bySlug = useCompanyBySlug(slugCountry, slug);

  const isLoading = matchById ? byId.isLoading : bySlug.isLoading;
  const isError   = matchById ? byId.isError   : bySlug.isError;
  const company   = matchById ? byId.data       : bySlug.data;

  if (isLoading) return <CompanyDetailsSkeleton />;
  if (isError || !company) return <CompanyNotFound />;

  const statusColor =
    company.status?.toLowerCase().includes("active") ? "bg-green-100 text-green-700" :
    company.status?.toLowerCase().includes("strike") ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-700";

  const regId = company.countryCode === "IN" ? company.cin : company.registrationNumber;
  const regLabel = company.countryCode === "IN" ? "CIN" :
    company.countryCode === "AU" ? "ACN" :
    company.countryCode === "GB" ? "Company No." :
    company.countryCode === "SG" ? "UEN" : "Reg. No.";

  const pageCanonical = canonicalUrl(company);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-slate-900 text-white py-16">
        <div className="container-width">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white mb-6 pl-0 hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex flex-wrap gap-3 mb-4">
                {regId && (
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0">
                    {regLabel}: {regId}
                  </Badge>
                )}
                {company.status && (
                  <Badge className={`${statusColor} border-0`}>{company.status}</Badge>
                )}
                <Badge variant="secondary" className="bg-white/10 text-white border-0 text-[10px]">
                  {COUNTRY_NAMES[company.countryCode || "IN"] || company.country || "India"}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">{company.name}</h1>
              <div className="flex items-center gap-2 text-white/60">
                <MapPin className="h-4 w-4" />
                <span>{company.address || [company.city, company.state].filter(Boolean).join(", ")}</span>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-2.5">
                <ShareBar
                  title={`${company.name} — Company Details`}
                  description={`View registration details and information for ${company.name}.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-width -mt-8 flex gap-6">
        <ServiceAside side="left" />
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Country-specific field sections */}
            {company.countryCode === "IN"
              ? <IndiaFields company={company} />
              : <GlobalFields company={company} />}

            {/* FAQ-style accordion */}
            <CompanyFaqSection company={company} />

            {/* Related companies + internal links */}
            <RelatedCompanies company={company} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {company.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <a href={`mailto:${company.email}`} className="text-primary hover:underline break-all text-sm">
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <a href={`tel:${company.phone}`} className="text-sm hover:underline">{company.phone}</a>
                    </div>
                  </div>
                )}
                {(company.address || company.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registered Address</p>
                      <p className="text-sm leading-relaxed mt-1">
                        {company.address && <>{company.address}<br /></>}
                        {[company.city, company.state, company.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canonical URL info */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Permanent Link</p>
                <Link href={pageCanonical} className="text-xs text-primary break-all hover:underline">
                  {typeof window !== "undefined" ? `${window.location.origin}${pageCanonical}` : pageCanonical}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <ServiceAside side="right" />
      </div>
      <BacklinkGrid />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoItem({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className="font-medium text-lg text-foreground">
        {value ?? <span className="text-muted-foreground/50 italic text-base">Not Available</span>}
      </p>
    </div>
  );
}

function CompanyDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-slate-900 h-64 w-full" />
      <div className="container-width -mt-32">
        <Skeleton className="h-12 w-32 mb-4 bg-white/10" />
        <Skeleton className="h-16 w-3/4 mb-8 bg-white/10" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <Skeleton className="col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function CompanyNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted p-6 rounded-full mb-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold font-display mb-2">Company Not Found</h1>
        <p className="text-muted-foreground mb-6">We couldn't locate the company you're looking for.</p>
        <Link href="/"><Button>Back to Directory</Button></Link>
      </div>
    </div>
  );
}
