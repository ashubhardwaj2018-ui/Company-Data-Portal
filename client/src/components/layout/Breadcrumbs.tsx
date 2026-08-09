import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string; // last crumb typically has no href
}

/**
 * Visual breadcrumb trail + BreadcrumbList JSON-LD for SEO.
 * Usage: <Breadcrumbs items={[{label:"India",href:"/countries/in"},{label:"Maharashtra"}]} />
 * A leading "Home" crumb is added automatically.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  const all: Crumb[] = [{ label: "Home", href: "/" }, ...items];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${origin}${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4" data-testid="breadcrumbs">
      {/* Escape <, >, & and line separators so labels from URL params cannot break out of the script tag (XSS) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd)
        .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") }} />
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />}
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-primary hover:underline flex items-center gap-1 truncate">
                  {i === 0 && <Home className="h-3 w-3" />}
                  {i === 0 ? null : c.label}
                  {i === 0 && <span className="sr-only">Home</span>}
                </Link>
              ) : (
                <span className={`truncate ${last ? "font-medium text-slate-700" : ""}`} aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
