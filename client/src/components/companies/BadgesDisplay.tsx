/**
 * Phase 26 — Company Badges
 * Renders badge pills (verified, featured, claimed, premium) from the badges JSON field.
 */
export const BADGE_STYLE: Record<string, { label: string; cls: string }> = {
  verified: { label: "✓ Verified",  cls: "bg-blue-100 text-blue-800 border border-blue-200" },
  featured:  { label: "⭐ Featured",  cls: "bg-yellow-100 text-yellow-800 border border-yellow-200" },
  claimed:   { label: "🏢 Claimed",   cls: "bg-green-100 text-green-800 border border-green-200" },
  premium:   { label: "💎 Premium",   cls: "bg-purple-100 text-purple-800 border border-purple-200" },
};

export function parseBadges(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

interface Props {
  badges: string[];
  size?: "sm" | "md";
  className?: string;
}

export function BadgesDisplay({ badges, size = "sm", className = "" }: Props) {
  if (!badges.length) return null;
  const base = size === "sm" ? "text-[10px] px-2 py-0.5 rounded-full font-bold" : "text-xs px-3 py-1 rounded-full font-bold";
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map(b => {
        const style = BADGE_STYLE[b];
        if (!style) return null;
        return (
          <span key={b} className={`${base} ${style.cls}`}>{style.label}</span>
        );
      })}
    </div>
  );
}
