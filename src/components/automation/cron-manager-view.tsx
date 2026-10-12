"use client";

import { useMemo, useState } from "react";

import { CronJobRow } from "@/components/automation/cron-job-row";
import { HEALTH_STYLES } from "@/components/automation/health-dot";
import { NoticeBanner } from "@/components/notice-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncAction } from "@/hooks/use-async-action";
import { requestJson } from "@/lib/request-json";
import type { CronEntry, CronHealth } from "@/lib/types";

type GroupBy = "brand" | "type";

/**
 * Groups jobs by brand or job type, sorted by group name.
 */
function groupJobs(jobs: CronEntry[], groupBy: GroupBy) {
  const groups = new Map<string, CronEntry[]>();
  for (const job of jobs) {
    const key = (groupBy === "brand" ? job.brandId : job.jobType) ?? (groupBy === "brand" ? "shared" : "other");
    groups.set(key, [...(groups.get(key) ?? []), job]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

type CronManagerViewProps = { jobs: CronEntry[]; error?: string; stale: boolean };

export function CronManagerView({ jobs, error, stale }: CronManagerViewProps) {
  const { busyAction, isBusy, notice, setNotice, run } = useAsyncAction();
  const [groupBy, setGroupBy] = useState<GroupBy>("brand");
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo(() => groupJobs(jobs, groupBy), [jobs, groupBy]);
  const healthCounts = useMemo(() => {
    const counts: Record<CronHealth, number> = { green: 0, yellow: 0, red: 0, grey: 0 };
    for (const job of jobs) {
      counts[job.health ?? "grey"] += 1;
    }
    return counts;
  }, [jobs]);

  const runJob = (job: CronEntry) =>
    run(`run-${job.id}`, async () => {
      await requestJson(`/api/crons/${encodeURIComponent(job.id)}/run`, { method: "POST" });
      setNotice({ kind: "ok", text: `Triggered ${job.name}.` });
    });

  const toggleJob = (job: CronEntry) =>
    run(`toggle-${job.id}`, async () => {
      const result = await requestJson<{ note?: string }>(`/api/crons/${encodeURIComponent(job.id)}/toggle`, {
        method: "POST",
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      setNotice({
        kind: "ok",
        text: `${job.name} ${job.enabled ? "disabled" : "enabled"}.${result.note ? ` ${result.note}` : ""}`,
      });
    });

  return (
    <div className="space-y-4">
      {stale ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          OpenClaw is unreachable — showing the last known job list. {error}
        </div>
      ) : null}
      <NoticeBanner notice={notice} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <ul className="flex flex-wrap gap-3 text-sm">
          {(Object.keys(HEALTH_STYLES) as CronHealth[]).map((health) => (
            <li key={health} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${HEALTH_STYLES[health].className}`} aria-hidden />
              <span className="text-slate-300">{HEALTH_STYLES[health].label}</span>
              <span className="font-semibold text-slate-100">{healthCounts[health]}</span>
            </li>
          ))}
        </ul>
        <label className="space-y-1 text-xs text-slate-400">
          Group by
          <Select aria-label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="w-40">
            <option value="brand">Brand</option>
            <option value="type">Job type</option>
          </Select>
        </label>
      </div>

      {groups.length ? (
        groups.map(([group, groupJobsList]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="capitalize">
                {group} <span className="text-sm font-normal text-slate-400">({groupJobsList.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Job</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupJobsList.map((job) => (
                    <CronJobRow
                      key={job.id}
                      job={job}
                      open={openId === job.id}
                      busy={isBusy && busyAction?.endsWith(job.id) === true}
                      onToggleOpen={() => setOpenId(openId === job.id ? null : job.id)}
                      onRun={() => runJob(job)}
                      onToggleEnabled={() => toggleJob(job)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">No cron jobs found.</CardContent>
        </Card>
      )}
    </div>
  );
}
