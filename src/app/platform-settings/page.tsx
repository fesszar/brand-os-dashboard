import { PageHeader } from "@/components/page-header";
import { PlatformSettingsView } from "@/components/publishing/platform-settings-view";
import { getBrandIds } from "@/lib/brand-os";
import { getPlatformSettings } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  const settings = await getPlatformSettings(await getBrandIds());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="Platform Settings"
        description="Global platform defaults with per-brand overrides, plus the Postiz connection and integration mapping."
      />
      <PlatformSettingsView settings={settings} />
    </div>
  );
}
