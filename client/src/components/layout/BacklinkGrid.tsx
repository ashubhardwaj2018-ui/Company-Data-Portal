import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";
import { ExternalLink } from "lucide-react";

const COLORS = [
  "from-blue-500 to-blue-700",
  "from-orange-500 to-orange-700",
  "from-green-500 to-green-700",
  "from-purple-500 to-purple-700",
  "from-pink-500 to-pink-700",
  "from-yellow-500 to-yellow-700",
  "from-teal-500 to-teal-700",
  "from-indigo-500 to-indigo-700",
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function BacklinkGrid() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const active = services.filter(s => s.isActive);
  if (active.length === 0) return null;

  // Distinct partner websites, in order of first appearance
  const domains = Array.from(new Set(active.map(s => hostOf(s.url)).filter(Boolean)));

  return (
    <section className="py-10 bg-gradient-to-br from-slate-50 to-blue-50 border-t">
      <div className="container-width">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Professional Services</p>
          <h3 className="text-2xl font-bold font-display text-slate-900">
            Business &amp; Compliance <span className="text-primary">Services</span>
          </h3>
          <p className="text-muted-foreground text-sm mt-2">
            Trusted services from our partner{domains.length > 1 ? "s" : ""}{" "}
            {domains.map((d, i) => (
              <span key={d}>
                {i > 0 && (i === domains.length - 1 ? " & " : ", ")}
                <a href={`https://${d}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{d}</a>
              </span>
            ))}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {active.map((s, idx) => {
            const color = COLORS[idx % COLORS.length];
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="group block" data-testid={`backlink-service-${s.id}`}>
                <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-4 h-full">
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${color} opacity-5 rounded-full translate-x-6 -translate-y-6`} />
                  <div className="text-3xl mb-2">{s.icon || "🔗"}</div>
                  <h4 className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors leading-tight mb-1">
                    {s.title}
                  </h4>
                  {s.description && <p className="text-xs text-muted-foreground leading-tight">{s.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-2">{hostOf(s.url)}</p>
                  <div className={`mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${color} rounded transition-all duration-300`} />
                </div>
              </a>
            );
          })}
        </div>

        {domains.length > 0 && (
          <div className="text-center mt-6 flex flex-wrap justify-center gap-3">
            {domains.map(d => (
              <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
                Visit {d}
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
