import { useRoute } from "wouter";
import { useCompany } from "@/hooks/use-companies";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, MapPin, Calendar, FileText,
  Mail, IndianRupee, ArrowLeft, HelpCircle 
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { ShareBar } from "@/components/layout/ShareBar";
import { ServiceAside } from "@/components/layout/ServiceAside";

export default function CompanyDetails() {
  const [, params] = useRoute("/company/:id");
  const id = parseInt(params?.id || "0");
  const { data: company, isLoading, isError } = useCompany(id);

  if (isLoading) return <CompanyDetailsSkeleton />;
  if (isError || !company) return <CompanyNotFound />;

  const statusColor = 
    company.status?.toLowerCase().includes("active") ? "bg-green-100 text-green-700" :
    company.status?.toLowerCase().includes("strike") ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-700";

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
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0">
                  CIN: {company.cin}
                </Badge>
                <Badge className={`${statusColor} border-0`}>
                  {company.status}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
                {company.name}
              </h1>
              <div className="flex items-center gap-2 text-white/60">
                <MapPin className="h-4 w-4" />
                <span>{company.address}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-3">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90">
                Track Company
              </Button>
              <div className="bg-white/10 rounded-xl px-4 py-2.5">
                <ShareBar
                  title={`${company.name} — Company Details | IndiaCorpDB`}
                  description={`View CIN, capital, incorporation date and full details for ${company.name} on IndiaCorpDB.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-width -mt-8 flex gap-6">
        <ServiceAside side="left" />
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoItem label="Class" value={company.class} />
              <InfoItem label="Category" value={company.category} />
              <InfoItem label="Sub Category" value={company.subCategory} />
              <InfoItem label="ROC Code" value={company.roc} />
              <InfoItem 
                label="Date of Incorporation" 
                value={company.incorporationDate ? format(new Date(company.incorporationDate), 'MMMM dd, yyyy') : 'N/A'} 
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoItem 
                label="Authorized Capital" 
                value={`₹ ${(company.authorizedCapital || 0).toLocaleString('en-IN')}`} 
                icon={<IndianRupee className="h-4 w-4" />}
              />
              <InfoItem 
                label="Paid-up Capital" 
                value={`₹ ${(company.paidUpCapital || 0).toLocaleString('en-IN')}`} 
                icon={<IndianRupee className="h-4 w-4" />}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Listing & Annual Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoItem 
                label="Last AGM Date" 
                value={company.lastAgmDate ? format(new Date(company.lastAgmDate), 'MMMM dd, yyyy') : 'N/A'} 
              />
              <InfoItem 
                label="Balance Sheet Date" 
                value={company.lastBalanceSheetDate ? format(new Date(company.lastBalanceSheetDate), 'MMMM dd, yyyy') : 'N/A'} 
              />
            </CardContent>
          </Card>

          {/* Company FAQ Accordion */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <HelpCircle className="h-5 w-5 text-primary" />
                Company Information (FAQ Style)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="overview">
                  <AccordionTrigger className="font-semibold">What type of company is {company.name}?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                    <p><strong>Class:</strong> {company.class || 'N/A'}</p>
                    <p><strong>Category:</strong> {company.category || 'N/A'}</p>
                    <p><strong>Sub-Category:</strong> {company.subCategory || 'N/A'}</p>
                    <p><strong>Status:</strong> {company.status || 'N/A'}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="registration">
                  <AccordionTrigger className="font-semibold">When was {company.name} incorporated?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                    <p><strong>CIN:</strong> {company.cin || 'N/A'}</p>
                    <p><strong>Date of Incorporation:</strong> {company.incorporationDate ? new Date(company.incorporationDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    <p><strong>ROC:</strong> {company.roc || 'N/A'}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="capital">
                  <AccordionTrigger className="font-semibold">What is the capital structure of {company.name}?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                    <p><strong>Authorised Capital:</strong> {company.authorizedCapital ? `₹ ${company.authorizedCapital.toLocaleString('en-IN')}` : 'N/A'}</p>
                    <p><strong>Paid-up Capital:</strong> {company.paidUpCapital ? `₹ ${company.paidUpCapital.toLocaleString('en-IN')}` : 'N/A'}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="location">
                  <AccordionTrigger className="font-semibold">Where is {company.name} located?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                    <p><strong>Address:</strong> {company.address || 'N/A'}</p>
                    <p><strong>City:</strong> {company.city || 'N/A'}</p>
                    <p><strong>State:</strong> {company.state || 'N/A'}</p>
                    <p><strong>Pincode:</strong> {company.pincode || 'N/A'}</p>
                    <p><strong>Country:</strong> {company.country || 'India'}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="compliance">
                  <AccordionTrigger className="font-semibold">What is the compliance status of {company.name}?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-1 text-sm">
                    <p><strong>Last AGM Date:</strong> {company.lastAgmDate ? new Date(company.lastAgmDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                    <p><strong>Last Balance Sheet Date:</strong> {company.lastBalanceSheetDate ? new Date(company.lastBalanceSheetDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                  </AccordionContent>
                </AccordionItem>
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
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
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
                    <a href={`mailto:${company.email}`} className="text-primary hover:underline break-all">
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registered Address</p>
                  <p className="text-sm leading-relaxed mt-1">
                    {company.address}<br/>
                    {company.city}, {company.state} - {company.pincode}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                 <a 
                  href="https://your-different-website.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded border overflow-hidden shrink-0">
                    <img 
                      src="https://via.placeholder.com/40" 
                      alt="Partner" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Partner Site</p>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Visit our different website</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-primary to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <h3 className="font-bold text-lg mb-2">Need detailed report?</h3>
            <p className="text-blue-100 text-sm mb-4">
              Get full financial statements, director details, and charge history.
            </p>
            <Button className="w-full bg-white text-primary hover:bg-blue-50">
              Request Full Report
            </Button>
          </div>
        </div>
        </div>
        <ServiceAside side="right" />
      </div>
      <BacklinkGrid />
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string, value: string | undefined | null, icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-medium text-lg text-foreground">
        {value || <span className="text-muted-foreground/50 italic">Not Available</span>}
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
        <Link href="/">
          <Button>Back to Directory</Button>
        </Link>
      </div>
    </div>
  );
}
