import { PageHeader } from "@/components/page-header";
import { PublishHistoryView } from "@/components/publishing/publish-history-view";
import { getBrandIds, listPublishHistory } from "@/lib/brand-os";

export const dynamic = "force-dynamic";

export default async function PublishHistoryPage() {
  const [entries, brandIds] = await Promise.all([listPublishHistory(), getBrandIds()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="Publish History"
        description="Every publish result across all brands, with per-platform outcomes and Postiz post IDs."
      />
      <PublishHistoryView entries={entries} brandIds={brandIds} />
    </div>
  );
}
