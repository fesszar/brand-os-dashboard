import { PipelineBrandCard } from "@/components/automation/pipeline-brand-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getPipelineMonitor } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function PipelineMonitorPage() {
  const brands = await getPipelineMonitor();
  const errors = brands.flatMap((brand) => brand.alerts).filter((alert) => alert.severity === "error").length;
  const warnings = brands.flatMap((brand) => brand.alerts).length - errors;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Pipeline Monitor"
        description="Generate → Draft → Publish → Analytics state for every brand, with alerts for stuck or failed work."
        actions={
          <div className="flex gap-2 text-sm">
            <span className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-200">
              {errors} error{errors === 1 ? "" : "s"}
            </span>
            <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
              {warnings} warning{warnings === 1 ? "" : "s"}
            </span>
          </div>
        }
      />
      {brands.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {brands.map((brand) => (
            <PipelineBrandCard key={brand.brandId} brand={brand} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">No brands found in the workspace.</CardContent>
        </Card>
      )}
    </div>
  );
}
