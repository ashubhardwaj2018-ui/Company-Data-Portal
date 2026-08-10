import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";
import { Building2, Globe, ExternalLink } from "lucide-react";

const COUNTRIES = [
  { name: "India", href: "/countries/in", flag: "🇮🇳" },
  { name: "Australia", href: "/countries/au", flag: "🇦🇺" },
  { name: "United Kingdom", href: "/countries/gb", flag: "🇬🇧" },
  { name: "Singapore", href: "/countries/sg", flag: "🇸🇬" },
  { name: "USA", href: "/countries/us", flag: "🇺🇸" },
];

const INDUSTRIES = [
  { name: "Technology", slug: "technology" },
  { name: "Manufacturing", slug: "manufacturing" },
  { name: "Finance", slug: "finance" },
  { name: "Healthcare", slug: "healthcare" },
  { name: "Construction", slug: "construction" },
  { name: "Retail", slug: "retail" },
  { name: "Education", slug: "education" },
  { name: "Logistics", slug: "logistics" },
];

const LOCATIONS = [
  { name: "Mumbai, India", href: "/countries/in/maharashtra/mumbai" },
  { name: "Delhi, India", href: "/countries/in/delhi/new-delhi" },
  { name: "Bengaluru, India", href: "/countries/in/karnataka/bengaluru" },
  { name: "Sydney, Australia", href: "/countries/au" },
  { name: "London, UK", href: "/countries/gb" },
  { name: "Singapore", href: "/countries/sg" },
];

const RESOURCES = [
  { name: "Articles", href: "/articles" },
  { name: "Blog", href: "/blog" },
  { name: "FAQ", href: "/faq" },
  { name: "About AddressBay", href: "/about" },
];

const LEGAL = [
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms of Service", href: "/terms" },
  { name: "Disclaimer", href: "/disclaimer" },
  { name: "Contact Us", href: "/contact" },
];

function PartnerStrip() {
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const domains = Array.from(new Set(
    services.filter(s => s.isActive).map(s => {
      try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return ""; }
    }).filter(Boolean)
  ));
  if (domains.length === 0) return null;
  return (
    <div className="border-b border-slate-800">
      <div className="container-width py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">Compliance &amp; registration services powered by</p>
        <div className="flex flex-wrap items-center gap-4">
          {domains.map(d => (
            <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{d}</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#171633] text-indigo-100/60">
      {/* Partner strip — driven by service links added in the admin panel */}
      <PartnerStrip />

      {/* Main columns */}
      <div className="container-width py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
               <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">
                 Address<span className="text-orange-300">Bay</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Global business intelligence and company discovery platform. Official government registration data from India, Australia, UK, Singapore, and USA.
            </p>
            <div className="flex items-center gap-1 mt-4 text-xs text-slate-500">
              <Globe className="h-3.5 w-3.5" />
              <span>Covering 5 countries worldwide</span>
            </div>
          </div>

          {/* Countries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Countries</h3>
            <ul className="space-y-2.5">
              {COUNTRIES.map(c => (
                <li key={c.href}>
                  <Link href={c.href} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                    <span>{c.flag}</span> {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Industries</h3>
            <ul className="space-y-2.5">
              {INDUSTRIES.map(i => (
                <li key={i.slug}>
                  <Link href={`/industry/${i.slug}`} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources + Legal */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Resources</h3>
            <ul className="space-y-2.5 mb-6">
              {RESOURCES.map(r => (
                <li key={r.href}>
                  <Link href={r.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {LEGAL.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Locations</h3>
            <ul className="space-y-2.5">
              {LOCATIONS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="container-width py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} AddressBay. All rights reserved. Data sourced from official government registries.
          </p>
          <p className="text-xs text-slate-600">
            Not affiliated with any government body.
          </p>
        </div>
      </div>
    </footer>
  );
}
