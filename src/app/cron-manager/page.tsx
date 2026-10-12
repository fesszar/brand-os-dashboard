import { CronManagerView } from "@/components/automation/cron-manager-view";
import { PageHeader } from "@/components/page-header";
import { listCrons } from "@/lib/crons";

export const dynamic = "force-dynamic";

export default async function CronManagerPage() {
  const crons = await listCrons();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Cron Manager"
        description="Brand OS jobs from OpenClaw: schedules, last runs, health, and manual controls."
      />
      <CronManagerView jobs={crons.jobs} error={crons.error} stale={crons.stale} />
    </div>
  );
}
