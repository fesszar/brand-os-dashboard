"use client";

import { Flame } from "lucide-react";

import { WarmupHistogram } from "@/components/automation/warmup-histogram";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";
import { requestJson } from "@/lib/request-json";
import type { WarmupBrandStatus } from "@/lib/types";

const STATUS_LABEL: Record<WarmupBrandStatus["status"], string> = {
  ok: "ok",
  stale: "pending (stale)",
  unknown: "no data",
};

export function WarmupView({ brands }: { brands: WarmupBrandStatus[] }) {
  const { busyAction, notice, setNotice, run } = useAsyncAction();

  const trigger = (brandId: string) =>
    run(`warmup-${brandId}`, async () => {
      await requestJson(`/api/warmup/${brandId}`, { method: "POST" });
      setNotice({ kind: "ok", text: `Warmup triggered for ${brandId}.` });
    });

  return (
    <div className="space-y-4">
      <NoticeBanner notice={notice} />
      <div className="grid gap-4 lg:grid-cols-2">
        {brands.map((brand) => (
          <Card key={brand.brandId} data-testid={`warmup-${brand.brandId}`}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {brand.brandId} <StatusBadge status={STATUS_LABEL[brand.status]} />
                </CardTitle>
                <CardDescription>
                  Last warmup: {brand.lastWarmupAt ? new Date(brand.lastWarmupAt).toLocaleString() : "never"}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  size="sm"
                  variant={brand.cronId ? "default" : "outline"}
                  onClick={() => trigger(brand.brandId)}
                  disabled={!brand.cronId || busyAction !== null}
                >
                  <Flame className="mr-1 h-3.5 w-3.5" /> Trigger Warmup
                </Button>
                <span className="font-mono text-[11px] text-slate-500">
                  {brand.cronId ? `cron ${brand.cronId}` : "No warmup cron mapped"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <WarmupHistogram counts={brand.hourHistogram} />
              {brand.platforms.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {brand.platforms.map((platform) => (
                    <li
                      key={platform.platform}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-sm"
                    >
                      <p className="font-medium capitalize text-slate-100">{platform.platform}</p>
                      <p className="text-xs text-slate-400">
                        {platform.count} run{platform.count === 1 ? "" : "s"} · last{" "}
                        {platform.lastWarmupAt ? new Date(platform.lastWarmupAt).toLocaleString() : "never"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No warmup events logged in experiments.jsonl.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
