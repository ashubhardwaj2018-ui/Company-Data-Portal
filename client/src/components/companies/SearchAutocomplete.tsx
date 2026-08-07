import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface Suggestion {
  id: number;
  name: string;
  cin: string | null;
  slug: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
  status: string | null;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: (v: string) => void;
  countryCode?: string;
  placeholder?: string;
}

function companyUrl(s: Suggestion) {
  if (s.slug && s.countryCode) return `/${s.countryCode.toLowerCase()}/company/${s.slug}`;
  return `/company/${s.id}`;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  countryCode,
  placeholder = "Search by company name, CIN, email...",
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isFetching } = useQuery<Suggestion[]>({
    queryKey: ["/api/companies/suggest", value, countryCode],
    queryFn: async () => {
      if (value.length < 2) return [];
      const p = new URLSearchParams({ q: value });
      if (countryCode) p.set("countryCode", countryCode);
      const res = await fetch(`/api/companies/suggest?${p}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: value.length >= 2,
    staleTime: 30_000,
  });

  const showDropdown = open && value.length >= 2;

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") { onSearch(value); setOpen(false); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        window.location.href = companyUrl(suggestions[activeIndex]);
      } else {
        onSearch(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input row */}
      <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-2">
        <Search className="h-6 w-6 text-slate-400 ml-3 shrink-0" />
        <Input
          ref={inputRef}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className="border-0 shadow-none focus-visible:ring-0 text-lg py-6 bg-transparent text-slate-900 placeholder:text-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); onSearch(""); setOpen(false); inputRef.current?.focus(); }}
            className="mr-1 p-1.5 rounded-full hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
        <button
          type="button"
          onClick={() => { onSearch(value); setOpen(false); }}
          className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shrink-0 hidden sm:block"
        >
          Search
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-left">
          {isFetching && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No matches found — press Enter to search</div>
          ) : (
            <ul role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={activeIndex === i}>
                  <a
                    href={companyUrl(s)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${activeIndex === i ? "bg-slate-50" : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate text-sm leading-tight">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {s.cin && <span className="text-xs text-slate-400 font-mono">{s.cin}</span>}
                        {(s.city || s.state) && (
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {[s.city, s.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.status && (
                      <Badge
                        className={`text-[10px] shrink-0 border-0 ${
                          s.status.toLowerCase().includes("active")
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.status}
                      </Badge>
                    )}
                  </a>
                </li>
              ))}
              {/* "See all" footer */}
              <li>
                <button
                  type="button"
                  onClick={() => { onSearch(value); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 transition-colors flex items-center gap-2 border-t border-slate-100"
                >
                  <Search className="h-3.5 w-3.5" />
                  See all results for &ldquo;{value}&rdquo;
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
