import Link from "next/link";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/funnel", label: "Funnel" },
  { href: "/experiments", label: "Experiments" },
];

export function AnalyticsNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1 text-sm" aria-label="Analytics sections">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active === link.href ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5",
            active === link.href ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "text-slate-300 hover:bg-slate-900",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
