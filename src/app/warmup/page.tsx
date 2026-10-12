import { WarmupView } from "@/components/automation/warmup-view";
import { PageHeader } from "@/components/page-header";
import { getWarmupStatus } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function WarmupPage() {
  const brands = await getWarmupStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Warmup Status"
        description="Last warmup per brand and platform, the chaos engine's timing spread, and manual triggers."
      />
      <WarmupView brands={brands} />
    </div>
  );
}
