/**
 * Phase 28 — Company Insights Widget
 * Auto-generates human-readable insights from company data fields.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { differenceInYears } from "date-fns";
import type { Company } from "@shared/schema";

function buildInsights(company: Company): string[] {
  const insights: string[] = [];

  // Company age
  if (company.incorporationDate) {
    const age = differenceInYears(new Date(), new Date(company.incorporationDate));
    if (age >= 50) insights.push(`${company.name} is a legacy enterprise — over ${age} years in operation.`);
    else if (age >= 25) insights.push(`Established in ${new Date(company.incorporationDate).getFullYear()}, this company has ${age} years of operating history.`);
    else if (age <= 3) insights.push(`A relatively young company, incorporated in ${new Date(company.incorporationDate).getFullYear()}.`);
    else insights.push(`Incorporated in ${new Date(company.incorporationDate).getFullYear()} — ${age} years of operational history.`);
  }

  // Capital scale
  if (company.authorizedCapital) {
    const cr = company.authorizedCapital / 10_000_000;
    if (cr >= 1000) insights.push(`With ₹${(cr / 100).toFixed(0)}Cr+ authorized capital, this is a large-cap enterprise.`);
    else if (cr >= 10) insights.push(`Authorized capital of ₹${cr.toFixed(0)}Cr places it in the mid-cap segment.`);
    else insights.push(`Authorized capital of ₹${(company.authorizedCapital / 100_000).toFixed(1)}L indicates a small-scale operation.`);
  }

  // Capital utilization
  if (company.authorizedCapital && company.paidUpCapital && company.authorizedCapital > 0) {
    const ratio = (company.paidUpCapital / company.authorizedCapital) * 100;
    if (ratio >= 90) insights.push(`Near-full capital deployment: ${ratio.toFixed(0)}% of authorized capital is paid-up.`);
    else if (ratio <= 20) insights.push(`Only ${ratio.toFixed(0)}% of authorized capital has been paid up — significant headroom for future fundraising.`);
  }

  // Status context
  if (company.status?.toLowerCase().includes("active")) {
    insights.push(`The company holds an Active status with the Registrar of Companies.`);
  } else if (company.status?.toLowerCase().includes("strike")) {
    insights.push(`⚠️ This company is under Strike-off — it may no longer be trading.`);
  }

  // Sector
  if (company.industry) {
    insights.push(`Classified under the ${company.industry} sector.`);
  } else if (company.category) {
    insights.push(`Organized as a "${company.category}" entity.`);
  }

  // Geography
  if (company.state && company.city) {
    insights.push(`Registered office is in ${company.city}, ${company.state}.`);
  }

  return insights.slice(0, 4);
}

export function InsightsWidget({ company }: { company: Company }) {
  const insights = buildInsights(company);
  if (!insights.length) return null;

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader className="border-b border-amber-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Company Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ul className="space-y-3">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
              <span className="mt-0.5 text-amber-400 text-base leading-none">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
