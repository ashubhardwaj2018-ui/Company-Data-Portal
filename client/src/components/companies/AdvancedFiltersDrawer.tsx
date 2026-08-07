/**
 * Phase 25 — Advanced Search Filters Drawer
 * Capital range, incorporation date range, sort order.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, X } from "lucide-react";

interface Filters {
  minCapital?: string;
  maxCapital?: string;
  incorporatedAfter?: string;
  incorporatedBefore?: string;
  sortBy?: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  activeCount: number;
}

const SORT_OPTIONS = [
  { value: "",            label: "Relevance (default)" },
  { value: "name",        label: "Name A–Z" },
  { value: "capital",     label: "Capital (high → low)" },
  { value: "incorporated",label: "Oldest first" },
  { value: "views",       label: "Most viewed" },
  { value: "recent",      label: "Recently updated" },
];

export function AdvancedFiltersDrawer({ filters, onChange, activeCount }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Filters>(filters);

  const apply = () => { onChange(local); setOpen(false); };
  const clear = () => { const empty: Filters = {}; setLocal(empty); onChange(empty); setOpen(false); };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`gap-2 ${activeCount > 0 ? "border-primary text-primary" : ""}`}
        onClick={() => { setLocal(filters); setOpen(true); }}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="ml-auto w-80 h-full bg-white shadow-2xl border-l flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-base">Advanced Filters</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Sort by */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Sort By</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  value={local.sortBy || ""}
                  onChange={e => setLocal(f => ({ ...f, sortBy: e.target.value || undefined }))}
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Authorised Capital */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Authorised Capital (₹)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={local.minCapital || ""}
                    onChange={e => setLocal(f => ({ ...f, minCapital: e.target.value || undefined }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={local.maxCapital || ""}
                    onChange={e => setLocal(f => ({ ...f, maxCapital: e.target.value || undefined }))}
                  />
                </div>
              </div>

              {/* Incorporation Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Incorporation Date
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">After</label>
                    <Input
                      type="date"
                      value={local.incorporatedAfter || ""}
                      onChange={e => setLocal(f => ({ ...f, incorporatedAfter: e.target.value || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Before</label>
                    <Input
                      type="date"
                      value={local.incorporatedBefore || ""}
                      onChange={e => setLocal(f => ({ ...f, incorporatedBefore: e.target.value || undefined }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={clear}>Clear All</Button>
              <Button size="sm" className="flex-1" onClick={apply}>Apply Filters</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
