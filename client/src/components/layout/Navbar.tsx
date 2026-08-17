import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  Building2, Globe, LayoutDashboard, LogOut, User,
  Upload, Bookmark, Scale, Menu, X, ChevronDown, Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const COUNTRIES = [
  { name: "India Company", code: "in", flag: "🇮🇳" },
  { name: "Australia Company", code: "au", flag: "🇦🇺" },
  { name: "United Kingdom Company", code: "gb", flag: "🇬🇧" },
  { name: "Singapore Company", code: "sg", flag: "🇸🇬" },
  { name: "USA Business", code: "us", flag: "🇺🇸" },
];

const INDUSTRIES = [
  "Technology", "Manufacturing", "Finance", "Healthcare",
  "Construction", "Retail", "Education", "Logistics",
];

function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 text-sm text-slate-600 hover:text-violet-700 font-medium transition-colors py-1"
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-amber-100 rounded-xl shadow-xl z-50 min-w-[200px] py-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { data: adminCheck } = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-amber-100">
      <div className="container-width flex h-15 items-center justify-between h-[60px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Building2 className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-slate-900">
            Address<span className="text-primary">Bay</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            Directory
          </Link>

          <NavDropdown label="Companies">
            {COUNTRIES.map(c => (
              <Link
                key={c.code}
                href={`/countries/${c.code}`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <span className="text-base">{c.flag}</span>
                {c.name}
              </Link>
            ))}
          </NavDropdown>

          <NavDropdown label="Industries">
            {INDUSTRIES.map(ind => (
              <Link
                key={ind}
                href={`/industry/${ind.toLowerCase().replace(/\s+/g, "-")}`}
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
              >
                {ind}
              </Link>
            ))}
          </NavDropdown>

          <Link href="/llps" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            Ind LLP
          </Link>
          <Link href="/ifsc" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            IFSC
          </Link>
          <Link href="/articles" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            Articles
          </Link>
          <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            Blog
          </Link>
          <Link href="/faq" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search shortcut */}
          <Link href="/" aria-label="Search" className="hidden md:flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
            <Search className="h-4 w-4" />
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {adminCheck?.isAdmin && (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/admin">
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                      <LayoutDashboard className="h-3.5 w-3.5" /> Admin
                    </button>
                  </Link>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    <Avatar className="h-8 w-8 border border-slate-200">
                      <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {user?.firstName?.[0] || <User className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile"><User className="mr-2 h-4 w-4" /> My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/watchlist"><Bookmark className="mr-2 h-4 w-4" /> Watchlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/compare"><Scale className="mr-2 h-4 w-4" /> Compare</Link>
                  </DropdownMenuItem>
                  {adminCheck?.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin?tab=upload"><Upload className="mr-2 h-4 w-4 text-orange-500" /> Upload Database</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin"><LayoutDashboard className="mr-2 h-4 w-4" /> Admin Panel</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white" aria-label="Mobile navigation">
          <div className="container-width py-4 space-y-1">
            <Link href="/" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">
              <Search className="h-4 w-4" /> Directory
            </Link>
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Companies</p>
              <div className="space-y-0.5">
                {COUNTRIES.map(c => (
                  <Link key={c.code} href={`/countries/${c.code}`} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">
                    <span>{c.flag}</span> {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Industries</p>
              <div className="grid grid-cols-2 gap-0.5">
                {INDUSTRIES.map(ind => (
                  <Link key={ind} href={`/industry/${ind.toLowerCase().replace(/\s+/g, "-")}`} className="px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">
                    {ind}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2 space-y-0.5">
              <Link href="/llps" className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">Ind LLP Directory</Link>
              <Link href="/ifsc" className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">IFSC Finder</Link>
              <Link href="/articles" className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">Articles</Link>
              <Link href="/blog" className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">Blog</Link>
              <Link href="/faq" className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md">FAQ</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
