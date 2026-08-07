import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Building2, Home, Search, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Page Not Found — AddressBay</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container-width text-center max-w-xl">
          {/* Visual */}
          <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Error 404</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Page not found</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
            Try searching for a company or browse our directory.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                <Home className="h-4 w-4" /> Go to Homepage
              </button>
            </Link>
            <Link href="/">
              <button className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                <Search className="h-4 w-4" /> Search Companies
              </button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-3 font-medium">Popular pages</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "🇮🇳 India", href: "/countries/in" },
                { label: "🇦🇺 Australia", href: "/countries/au" },
                { label: "🇬🇧 United Kingdom", href: "/countries/gb" },
                { label: "🇸🇬 Singapore", href: "/countries/sg" },
                { label: "Articles", href: "/articles" },
                { label: "Blog", href: "/blog" },
                { label: "FAQ", href: "/faq" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="text-xs px-3 py-1.5 border border-slate-200 rounded-full text-slate-600 hover:border-primary hover:text-primary transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
