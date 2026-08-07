/**
 * Phase 15 — Sticky comparison bar (localStorage + custom event bus)
 * Appears at the bottom of the screen when ≥1 company is queued for comparison.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X, Scale } from "lucide-react";

const STORAGE_KEY = "compare_ids";
const MAX = 3;

export function getCompareIds(): number[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export function addToCompare(id: number): boolean {
  const ids = getCompareIds();
  if (ids.includes(id) || ids.length >= MAX) return ids.length >= MAX;
  const next = [...ids, id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("comparechange"));
  return false;
}

export function removeFromCompare(id: number) {
  const ids = getCompareIds().filter(x => x !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("comparechange"));
}

export function clearCompare() {
  localStorage.setItem(STORAGE_KEY, "[]");
  window.dispatchEvent(new Event("comparechange"));
}

export function isInCompare(id: number): boolean {
  return getCompareIds().includes(id);
}

export function CompareBar() {
  const [ids, setIds] = useState<number[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const update = () => {
      const current = getCompareIds();
      setIds(current);
      current.forEach(async id => {
        if (names[id]) return;
        try {
          const res = await fetch(`/api/companies/${id}`);
          if (res.ok) {
            const c = await res.json();
            setNames(n => ({ ...n, [id]: c.name }));
          }
        } catch {}
      });
    };
    update();
    window.addEventListener("comparechange", update);
    return () => window.removeEventListener("comparechange", update);
  }, [names]);

  if (!ids.length) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-slate-900 text-white shadow-2xl">
      <div className="container-width flex items-center justify-between h-14 gap-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <Scale className="h-4 w-4 text-blue-300 shrink-0" />
          <span className="text-xs text-blue-300 shrink-0">Compare ({ids.length}/{MAX}):</span>
          {ids.map(id => (
            <span key={id} className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs whitespace-nowrap">
              {names[id] || `#${id}`}
              <button onClick={() => removeFromCompare(id)} className="text-white/50 hover:text-white ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs" onClick={clearCompare}>Clear</Button>
          <Link href={`/compare?ids=${ids.join(",")}`}>
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
              Compare →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
