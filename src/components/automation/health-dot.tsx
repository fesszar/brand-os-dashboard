import { cn } from "@/lib/utils";
import type { CronHealth } from "@/lib/types";

const HEALTH_STYLES: Record<CronHealth, { className: string; label: string }> = {
  green: { className: "bg-emerald-400", label: "Healthy" },
  yellow: { className: "bg-amber-400", label: "Last run had issues" },
  red: { className: "bg-rose-500", label: "Failed 3+ times" },
  grey: { className: "bg-slate-500", label: "Disabled or unknown" },
};

export function HealthDot({ health }: { health: CronHealth }) {
  const style = HEALTH_STYLES[health];
  return (
    <span className="inline-flex items-center gap-2" title={style.label}>
      <span className={cn("h-2.5 w-2.5 rounded-full", style.className)} aria-hidden />
      <span className="sr-only">{style.label}</span>
    </span>
  );
}

export { HEALTH_STYLES };
