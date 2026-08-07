/**
 * Phase 15 — Compare toggle button (used on company detail page header)
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import { addToCompare, removeFromCompare, isInCompare } from "@/components/companies/CompareBar";
import type { Company } from "@shared/schema";

export function CompareToggle({ company }: { company: Company }) {
  const [inCompare, setInCompare] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const update = () => {
      setInCompare(isInCompare(company.id));
    };
    update();
    window.addEventListener("comparechange", update);
    return () => window.removeEventListener("comparechange", update);
  }, [company.id]);

  const toggle = () => {
    if (inCompare) {
      removeFromCompare(company.id);
      setFull(false);
    } else {
      const wasFull = addToCompare(company.id);
      if (wasFull) { setFull(true); setTimeout(() => setFull(false), 2000); }
    }
  };

  return (
    <div>
      {full && <p className="text-xs text-orange-300 mb-1">Compare list is full (max 3)</p>}
      <Button
        variant={inCompare ? "default" : "outline"}
        size="sm"
        className={`gap-2 ${inCompare ? "bg-purple-600 text-white hover:bg-purple-700 border-0" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        onClick={toggle}
      >
        <Scale className="h-4 w-4" />
        {inCompare ? "In Compare" : "Compare"}
      </Button>
    </div>
  );
}
