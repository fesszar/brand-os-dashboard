"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  GalleryHorizontal,
  Home,
  Megaphone,
  Settings,
  Upload,
  Users,
  Video,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/brands", label: "Brands", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/drafts", label: "Drafts", icon: GalleryHorizontal },
  { href: "/scripts", label: "Scripts", icon: Video },
  { href: "/uploads", label: "Uploads", icon: Upload },
  { href: "/publish-history", label: "Publish History", icon: Megaphone },
  { href: "/platform-settings", label: "Platform Settings", icon: Settings },
  { href: "/cron-manager", label: "Cron Manager", icon: Clock3 },
  { href: "/pipeline-monitor", label: "Pipeline Monitor", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Global Settings", icon: Activity },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r border-slate-800 bg-slate-950/90 md:w-72">
      <div className="sticky top-0 h-screen overflow-y-auto px-4 py-6">
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Brand OS</p>
          <p className="mt-1 text-xl font-bold text-slate-50">Command Center</p>
          <p className="mt-2 text-sm text-slate-400">Automation pipeline dashboard</p>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "text-slate-300 hover:bg-slate-900 hover:text-slate-100",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
