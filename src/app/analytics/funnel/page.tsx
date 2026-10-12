import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { FunnelSection } from "@/components/analytics/funnel-section";
import { PageHeader } from "@/components/page-header";
import { FUNNEL_BRAND_ID, getFunnelAnalytics } from "@/lib/analytics-data";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const funnel = await getFunnelAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Funnel Analytics"
        description={`Stage, CTA and lead conversion for ${FUNNEL_BRAND_ID}, using only numbers logged in experiments.jsonl.`}
        actions={<AnalyticsNav active="/analytics/funnel" />}
      />
      <FunnelSection data={funnel} />
    </div>
  );
}
