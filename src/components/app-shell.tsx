import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#10223f_0%,#071021_40%,#030711_85%)] text-slate-100">
      <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
        <SidebarNav />
        <main className="w-full px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
