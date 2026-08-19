import { Link } from "wouter";
import { Building2, CheckCircle2, Globe2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LegalPage } from "./LegalPage";

const COVERAGE = [
  { country: "India", flag: "🇮🇳", registrar: "Ministry of Corporate Affairs" },
  { country: "Australia", flag: "🇦🇺", registrar: "Australian Securities and Investments Commission" },
  { country: "United Kingdom", flag: "🇬🇧", registrar: "Companies House" },
  { country: "Singapore", flag: "🇸🇬", registrar: "Accounting and Corporate Regulatory Authority" },
  { country: "United States", flag: "🇺🇸", registrar: "State corporate registries" },
];

const PRINCIPLES = [
  {
    icon: Search,
    title: "Easy company discovery",
    body: "Search registered businesses by name, country, region, industry, and other useful public-record details.",
  },
  {
    icon: Globe2,
    title: "Global coverage",
    body: "Explore company registration information across five countries from one consistent, easy-to-use directory.",
  },
  {
    icon: ShieldCheck,
    title: "Public-source data",
    body: "Profiles are compiled from official government registries and other publicly available registration sources.",
  },
];

export default function AboutAddressBay() {
  return (
    <LegalPage
      title="About AddressBay"
      subtitle="A global company directory that makes public business registration information easier to find and understand."
    >
      <section className="text-base text-slate-600">
        <p className="text-lg leading-relaxed text-slate-700">
          AddressBay is a business intelligence and company discovery platform. We bring together public company
          registration information so founders, researchers, professionals, and customers can find business details
          more easily.
        </p>
      </section>

      <section>
        <h2>What We Do</h2>
        <p>
          Company registries can be difficult to search across jurisdictions. AddressBay organizes public registration
          records into searchable company profiles, helping visitors explore names, registration identifiers, company
          status, registered locations, and other available business information in one place.
        </p>
      </section>

      <section>
        <h2>What You Can Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 !mt-4">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="ab-card p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Countries We Cover</h2>
        <p>AddressBay currently brings together company data from the following jurisdictions:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 !mt-4">
          {COVERAGE.map(({ country, flag, registrar }) => (
            <div key={country} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-2xl" aria-hidden="true">{flag}</span>
              <div>
                <p className="font-semibold text-slate-900">{country}</p>
                <p className="text-xs text-slate-500">{registrar}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Our Data Approach</h2>
        <ul>
          <li>We use public company registration information and official registry sources where available.</li>
          <li>We present data for research and informational purposes, not as legal, financial, or compliance advice.</li>
          <li>Registry records can change or be updated after publication, so official records remain the source of truth.</li>
          <li>AddressBay is not affiliated with or endorsed by any government registry or company listed on the platform.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-slate-900 p-6 text-slate-200">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-indigo-300 mt-0.5" />
          <div>
            <h2 className="!text-white">Help Keep the Directory Useful</h2>
            <p>
              Found an inaccurate profile or represent a listed business? You can suggest a correction or claim a
              company profile so our directory stays as useful and up to date as possible.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                <Building2 className="h-4 w-4" /> Find a company
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                <CheckCircle2 className="h-4 w-4" /> Contact AddressBay
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LegalPage>
  );
}