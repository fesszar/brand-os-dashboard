import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { ExperimentsView } from "@/components/analytics/experiments-view";
import { PageHeader } from "@/components/page-header";
import { listAllExperiments } from "@/lib/analytics-data";
import { getBrandIds } from "@/lib/brand-os";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const [experiments, brandIds] = await Promise.all([listAllExperiments(), getBrandIds()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Experiment Tracker"
        description="Hypotheses, variants and significance (two-proportion z-test on engagement/views vs control, p < 0.05)."
        actions={<AnalyticsNav active="/experiments" />}
      />
      <ExperimentsView experiments={experiments} brandIds={brandIds} />
    </div>
  );
}
