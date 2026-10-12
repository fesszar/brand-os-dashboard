"use client";

import Link from "next/link";
import { useState } from "react";

import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { GlobalSettings } from "@/lib/global-settings";
import { requestJson } from "@/lib/request-json";

type GlobalSettingsFormProps = {
  settings: GlobalSettings;
  timezones: string[];
  channels: readonly string[];
  events: readonly { key: string; label: string }[];
};

export function GlobalSettingsForm({ settings, timezones, channels, events }: GlobalSettingsFormProps) {
  const { isBusy, notice, setNotice, run } = useAsyncAction();
  const [form, setForm] = useState(settings);
  const set = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = () =>
    run("save", async () => {
      await requestJson("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          timezone: form.timezone,
          defaultGenerationModel: form.defaultGenerationModel,
          defaultPublishingModel: form.defaultPublishingModel,
          notificationChannel: form.notificationChannel,
          notificationEvents: form.notificationEvents,
        }),
      });
      setNotice({ kind: "ok", text: "Settings saved." });
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <NoticeBanner notice={notice} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription className="font-mono">{settings.workspace}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-xs text-slate-400">
              Timezone
              <Select aria-label="Timezone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              Default generation model
              <Input aria-label="Default generation model" value={form.defaultGenerationModel} onChange={(e) => set("defaultGenerationModel", e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              Default publishing model
              <Input aria-label="Default publishing model" value={form.defaultPublishingModel} onChange={(e) => set("defaultPublishingModel", e.target.value)} />
            </label>
            <p className="text-xs text-slate-500">
              Postiz API: {settings.postizConfigured ? "configured" : "not configured"} ·{" "}
              <Link href="/platform-settings" className="text-[var(--accent)] hover:underline">
                manage in Platform Settings
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>What Brand OS sends, and where</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-xs text-slate-400">
              Channel
              <Select aria-label="Notification channel" value={form.notificationChannel} onChange={(e) => set("notificationChannel", e.target.value)}>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </Select>
            </label>
            <fieldset className="grid gap-2 sm:grid-cols-2" disabled={form.notificationChannel === "none"}>
              <legend className="mb-1 text-xs text-slate-400">Events</legend>
              {events.map((event) => (
                <label key={event.key} className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={form.notificationEvents.includes(event.key)}
                    onChange={(e) =>
                      set(
                        "notificationEvents",
                        e.target.checked
                          ? [...form.notificationEvents, event.key]
                          : form.notificationEvents.filter((key) => key !== event.key),
                      )
                    }
                  />
                  {event.label}
                </label>
              ))}
            </fieldset>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isBusy}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}
