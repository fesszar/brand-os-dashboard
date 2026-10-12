import { PageHeader } from "@/components/page-header";
import { GlobalSettingsForm } from "@/components/settings/global-settings-form";
import { getGlobalSettings, NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS } from "@/lib/global-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getGlobalSettings();
  const zones = Intl.supportedValuesOf("timeZone");
  const timezones = zones.includes(settings.timezone) ? zones : [settings.timezone, ...zones];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Global Settings"
        description="Timezone, default models and notification preferences shared by every brand."
      />
      <GlobalSettingsForm
        settings={settings}
        timezones={timezones}
        channels={NOTIFICATION_CHANNELS}
        events={NOTIFICATION_EVENTS}
      />
    </div>
  );
}
