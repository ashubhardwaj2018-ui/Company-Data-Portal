import { Link } from "wouter";
import { type Company } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Calendar, IndianRupee, Scale } from "lucide-react";
import { format } from "date-fns";
import { addToCompare, isInCompare, removeFromCompare } from "./CompareBar";
import { BadgesDisplay, parseBadges } from "./BadgesDisplay";
import { useState, useEffect } from "react";

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

  const regId = company.countryCode === "IN" ? company.cin : (company.registrationNumber || company.cin);

  const badges = parseBadges(company.badges);
  const [inCompare, setInCompare] = useState(() => isInCompare(company.id));
  useEffect(() => {
    const update = () => setInCompare(isInCompare(company.id));
    window.addEventListener("comparechange", update);
    return () => window.removeEventListener("comparechange", update);
  }, [company.id]);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inCompare) removeFromCompare(company.id);
    else addToCompare(company.id);
  };

  return (
    <Link href={companyUrl(company)} className="block h-full group">
      <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <Badge variant="outline" className="mb-2 font-mono text-xs text-muted-foreground">
                {company.cin}
              </Badge>
              <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                {company.name}
              </CardTitle>
              {badges.length > 0 && <BadgesDisplay badges={badges} size="sm" className="mt-1" />}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge className={`${statusColor} border-0`}>
                {company.status || "Unknown"}
              </Badge>
              <button
                onClick={handleCompare}
                title={inCompare ? "Remove from compare" : "Add to compare"}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  inCompare
                    ? "bg-purple-100 text-purple-700 border-purple-300"
                    : "text-muted-foreground border-muted-foreground/30 hover:border-purple-400 hover:text-purple-600"
                }`}
              >
                <Scale className="h-3 w-3" />
                {inCompare ? "Added" : "Compare"}
              </button>
            </div>
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
