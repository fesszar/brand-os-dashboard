"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight, Play } from "lucide-react";

import { HealthDot } from "@/components/automation/health-dot";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CronEntry } from "@/lib/types";

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString() : "—";
}

type CronJobRowProps = {
  job: CronEntry;
  open: boolean;
  busy: boolean;
  onToggleOpen: () => void;
  onRun: () => void;
  onToggleEnabled: () => void;
};

export function CronJobRow({ job, open, busy, onToggleOpen, onRun, onToggleEnabled }: CronJobRowProps) {
  const runs = job.recentRuns ?? [];

  return (
    <Fragment>
      <TableRow>
        <TableCell>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label={open ? `Hide runs for ${job.name}` : `Show runs for ${job.name}`}
            className="text-slate-400 hover:text-slate-100"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <HealthDot health={job.health ?? "grey"} />
            <span className="font-medium text-slate-100">{job.name}</span>
          </div>
          <p className="font-mono text-xs text-slate-500">{job.id}</p>
        </TableCell>
        <TableCell>
          <p className="text-sm text-slate-200">{job.scheduleText ?? job.schedule}</p>
          <p className="font-mono text-xs text-slate-500">{job.schedule}</p>
        </TableCell>
        <TableCell className="text-xs text-slate-300">{formatTime(job.lastRun)}</TableCell>
        <TableCell>
          <StatusBadge status={job.lastStatus} />
        </TableCell>
        <TableCell className="text-xs text-slate-300">{formatTime(job.nextRun)}</TableCell>
        <TableCell className="space-x-2 whitespace-nowrap text-right">
          <Button variant="outline" size="sm" onClick={onToggleEnabled} disabled={busy}>
            {job.enabled ? "Disable" : "Enable"}
          </Button>
          <Button size="sm" onClick={onRun} disabled={busy || !job.enabled}>
            <Play className="mr-1 h-3.5 w-3.5" /> Run Now
          </Button>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={7} className="bg-slate-950/60">
            {runs.length ? (
              <ul className="space-y-1 text-xs">
                {runs.map((run) => (
                  <li key={run.at} className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={run.status} />
                    <span className="text-slate-300">{formatTime(run.at)}</span>
                    {run.message ? <span className="text-slate-500">{run.message}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No run history reported by OpenClaw for this job.</p>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
