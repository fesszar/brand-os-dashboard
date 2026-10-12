import { AlertTriangle, ArrowRight, CircleAlert, CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import { Fragment } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PipelineBrand, StageStatus } from "@/lib/types";

const STAGE_STYLES: Record<StageStatus, { box: string; icon: typeof CircleCheck; label: string }> = {
  ok: { box: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", icon: CircleCheck, label: "OK" },
  warning: { box: "border-amber-500/40 bg-amber-500/10 text-amber-200", icon: CircleAlert, label: "Needs attention" },
  error: { box: "border-rose-500/50 bg-rose-500/10 text-rose-200", icon: AlertTriangle, label: "Failing" },
  idle: { box: "border-slate-700 bg-slate-900/60 text-slate-400", icon: CircleMinus, label: "Idle" },
};

function relative(value: string | null) {
  return value ? new Date(value).toLocaleString() : "never";
}

/**
 * One brand's pipeline as a left-to-right flow of stage nodes plus its alerts.
 */
export function PipelineBrandCard({ brand }: { brand: PipelineBrand }) {
  return (
    <Card data-testid={`pipeline-${brand.brandId}`}>
      <CardHeader>
        <CardTitle>{brand.brandId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {brand.stages.map((stage, index) => {
            const style = STAGE_STYLES[stage.status];
            const Icon = style.icon;
            return (
              <Fragment key={stage.name}>
                {index > 0 ? (
                  <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 self-center text-slate-600 sm:rotate-0" aria-hidden />
                ) : null}
                <li className={cn("flex-1 rounded-lg border p-3", style.box)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">{stage.name}</span>
                    <Icon className="h-4 w-4" aria-label={style.label} />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-slate-100">{stage.value}</p>
                  <p className="text-xs">{stage.detail}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Last: {relative(stage.lastAt)}</p>
                </li>
              </Fragment>
            );
          })}
        </ol>

        {brand.alerts.length ? (
          <ul className="space-y-1">
            {brand.alerts.map((alert) => (
              <li
                key={alert.message}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                  alert.severity === "error" ? "text-rose-200" : "text-amber-200",
                )}
              >
                {alert.severity === "error" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-label="Error" />
                ) : (
                  <CircleAlert className="h-4 w-4 shrink-0" aria-label="Warning" />
                )}
                {alert.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <CircleDashed className="h-4 w-4" aria-hidden /> No alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
