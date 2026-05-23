import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";
import { ExternalLink } from "lucide-react";

interface Props {
  side?: "left" | "right";
}

export function ServiceAside({ side = "right" }: Props) {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const active = services.filter(s => s.isActive);
  if (active.length === 0) return null;

  const half = Math.ceil(active.length / 2);
  const items = side === "left" ? active.slice(0, half) : active.slice(half);
  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:flex flex-col gap-3 w-48 flex-shrink-0" aria-label={`${side} service links`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
        Startup Services
      </p>
      {items.map(svc => (
        <a
          key={svc.id}
          href={svc.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`service-aside-${svc.id}`}
          className="group flex flex-col rounded-xl overflow-hidden border border-slate-200 hover:border-orange-300 shadow-sm hover:shadow-md transition-all bg-white"
        >
          {/* Image or gradient banner */}
          {svc.imageUrl ? (
            <img
              src={svc.imageUrl}
              alt={svc.title}
              className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-20 bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-300">
              {svc.icon || "🔗"}
            </div>
          )}
          <div className="p-2.5">
            <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 group-hover:text-orange-700 transition-colors">
              {svc.title}
            </p>
            {svc.description && (
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{svc.description}</p>
            )}
            <span className="flex items-center gap-1 text-[10px] text-orange-500 mt-1 font-medium">
              <ExternalLink className="h-2.5 w-2.5" /> Learn more
            </span>
          </div>
        </a>
      ))}
      <a
        href="https://startupcaservices.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-center text-orange-400 hover:text-orange-600 font-medium underline underline-offset-2"
      >
        startupcaservices.com →
      </a>
    </aside>
  );
}
