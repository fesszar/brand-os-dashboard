import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandList } from "@/lib/brand-os";

export default async function BrandsPage() {
  const brands = await getBrandList();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Brands</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Brand List</h1>
          <p className="mt-2 text-sm text-slate-400">
            Active, inactive, and decommissioned Brand OS properties.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{brand.name}</CardTitle>
                <StatusBadge status={brand.status} />
              </div>
              <CardDescription>{brand.id}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              {brand.category ? <Badge variant="outline">{brand.category}</Badge> : null}
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-xs text-slate-400">Posts this week</p>
                  <p className="text-lg font-semibold text-slate-100">{brand.postsThisWeek}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-xs text-slate-400">Engagement</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {brand.engagementRate.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Next slot: {brand.nextScheduledPost ? brand.nextScheduledPost : "Not configured"}
              </p>
            </CardContent>

            <CardFooter>
              <Link
                href={`/brands/${brand.id}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)]"
              >
                Open Brand Workspace
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
