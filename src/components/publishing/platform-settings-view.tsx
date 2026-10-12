"use client";

import { useState } from "react";

import { NoticeBanner } from "@/components/notice-banner";
import { PostizConnectionCard } from "@/components/publishing/postiz-connection-card";
import { SettingsFields, setSetting } from "@/components/publishing/settings-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { getPlatformSettings, PostizStatus } from "@/lib/platform-settings";
import { mergeSettings, type PlatformSettingsMap } from "@/lib/platform-settings-schema";
import { requestJson } from "@/lib/request-json";

type Settings = Awaited<ReturnType<typeof getPlatformSettings>>;

export function PlatformSettingsView({ settings }: { settings: Settings }) {
  const { isBusy, notice, setNotice, run } = useAsyncAction();
  const [defaults, setDefaults] = useState<PlatformSettingsMap>(settings.defaults);
  const [brandId, setBrandId] = useState(settings.brands[0]?.brandId ?? "");
  const [overrides, setOverrides] = useState<Record<string, PlatformSettingsMap>>(
    Object.fromEntries(settings.brands.map((brand) => [brand.brandId, brand.overrides])),
  );

  const save = (body: Record<string, unknown>, label: string) =>
    run(`save-${label}`, async () => {
      await requestJson("/api/platform-settings", { method: "PUT", body: JSON.stringify(body) });
      setNotice({ kind: "ok", text: `Saved ${label} settings.` });
    });

  const testConnection = () =>
    run("postiz-test", async () => {
      const status = await requestJson<PostizStatus>("/api/postiz/test", { method: "POST" });
      setNotice({ kind: status.ok ? "ok" : "error", text: `Postiz: ${status.message}` });
    });

  const brandOverrides = overrides[brandId] ?? {};

  return (
    <div className="space-y-6">
      <NoticeBanner notice={notice} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Global Defaults</CardTitle>
            <CardDescription>Applied to every brand unless overridden.</CardDescription>
          </div>
          <Button onClick={() => save({ defaults }, "global")} disabled={isBusy}>
            Save Defaults
          </Button>
        </CardHeader>
        <CardContent>
          <SettingsFields
            idPrefix="defaults"
            values={defaults}
            onChange={(platform, key, value) => setDefaults((current) => setSetting(current, platform, key, value))}
          />
        </CardContent>
      </Card>

      {settings.brands.length ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>Brand Overrides</CardTitle>
              <CardDescription>Unset fields inherit the global default.</CardDescription>
              <Select aria-label="Brand to configure" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-56">
                {settings.brands.map((brand) => (
                  <option key={brand.brandId} value={brand.brandId}>
                    {brand.brandId}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => save({ brandId, overrides: brandOverrides }, brandId)} disabled={isBusy}>
              Save {brandId}
            </Button>
          </CardHeader>
          <CardContent>
            <SettingsFields
              key={brandId}
              idPrefix={`brand-${brandId}`}
              values={brandOverrides}
              inherited={mergeSettings(defaults, {})}
              onChange={(platform, key, value) =>
                setOverrides((current) => ({
                  ...current,
                  [brandId]: setSetting(current[brandId] ?? {}, platform, key, value),
                }))
              }
            />
          </CardContent>
        </Card>
      ) : null}

      <PostizConnectionCard postiz={settings.postiz} brands={settings.brands} busy={isBusy} onTest={testConnection} />
    </div>
  );
}
