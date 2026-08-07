import { Link } from "wouter";
import { type Company } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Calendar, IndianRupee } from "lucide-react";
import { format } from "date-fns";

/** Returns the canonical URL for a company: slug-based if possible, ID-based fallback. */
function companyUrl(company: Company): string {
  if (company.slug && company.countryCode) {
    return `/${company.countryCode.toLowerCase()}/company/${company.slug}`;
  }
  return `/company/${company.id}`;
}

export function CompanyCard({ company }: { company: Company }) {
  const statusColor = 
    company.status?.toLowerCase().includes("active") ? "bg-green-100 text-green-700 hover:bg-green-200" :
    company.status?.toLowerCase().includes("strike") ? "bg-red-100 text-red-700 hover:bg-red-200" :
    "bg-gray-100 text-gray-700 hover:bg-gray-200";

  // Use registration number label based on country
  const regId = company.countryCode === "IN" ? company.cin : (company.registrationNumber || company.cin);

  return (
    <Link href={companyUrl(company)} className="block h-full group">
      <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <Badge variant="outline" className="mb-2 font-mono text-xs text-muted-foreground">
                {company.cin}
              </Badge>
              <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                {company.name}
              </CardTitle>
            </div>
            <Badge className={`shrink-0 ${statusColor} border-0`}>
              {company.status || "Unknown"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{company.city || "N/A"}, {company.state || company.country || "India"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{company.incorporationDate ? format(new Date(company.incorporationDate), 'yyyy') : "N/A"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <Building className="h-4 w-4 shrink-0" />
              <span className="truncate">{company.category} • {company.class}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 text-xs text-muted-foreground border-t bg-muted/20 p-4 mt-auto">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />
            Authorized Capital: {(company.authorizedCapital || 0).toLocaleString('en-IN')}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
