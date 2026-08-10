import { useQuery } from "@tanstack/react-query";
import type { Service, Company } from "@shared/schema";

const MAX_LINKS = 3;

function isInternalUrl(url: string): boolean {
  // Single-slash same-origin path only; "//host" is protocol-relative (external)
  return url.startsWith("/") && !url.startsWith("//");
}

function isValidUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (isInternalUrl(u)) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Renders a subtle, dynamically generated services paragraph.
 * Reads the live service configuration (/api/services — active services only),
 * dedupes by canonical URL, shows top-priority links, and hides itself
 * entirely when no valid services exist.
 */
export function DynamicServicesParagraph({ company }: { company: Company }) {
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  // Valid + deduped by canonical URL, in configured order
  const seen = new Set<string>();
  const valid = services
    .filter(s => s.isActive === true && s.title?.trim() && isValidUrl(s.url))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter(s => {
      const key = s.url.trim().replace(/\/+$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!valid.length) return null;

  const shown = valid.slice(0, MAX_LINKS);
  const hasMore = valid.length > shown.length;

  // Light company context without unsupported claims
  const context = company.country?.trim()
    ? `business registration and compliance services in ${company.country.trim()}`
    : "business registration and compliance services";

  return (
    <p className="text-sm leading-relaxed text-slate-500 px-1" data-testid="text-services-paragraph">
      Looking for {context}? Explore{" "}
      {shown.map((s, i) => (
        <span key={s.id}>
          {i > 0 && (i === shown.length - 1 && !hasMore ? " and " : ", ")}
          <a
            href={s.url}
            className="font-medium text-primary hover:underline"
            target={isInternalUrl(s.url.trim()) ? undefined : "_blank"}
            rel={isInternalUrl(s.url.trim()) ? undefined : "noopener noreferrer"}
            data-testid={`link-service-paragraph-${s.id}`}
          >
            {s.title.trim()}
          </a>
        </span>
      ))}
      {hasMore ? " and other business services" : ""} available through AddressBay.
    </p>
  );
}
