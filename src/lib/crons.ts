import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getBrandIds } from "@/lib/brand-os";
import {
  computeCronHealth,
  describeCron,
  describeInterval,
  inferBrandId,
  inferJobType,
} from "@/lib/cron-schedule";
import type { CronEntry, CronRun } from "@/lib/types";
import { asRecord, getPaths, readJsonFile, writeJsonState } from "@/lib/workspace";

const execFileAsync = promisify(execFile);
const CLI_TIMEOUT_MS = 15_000;

type CronList = { jobs: CronEntry[]; error?: string; stale: boolean };

function pickString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

function toIso(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return typeof value === "string" ? value : undefined;
}

function normalizeStatus(value: unknown): CronRun["status"] {
  if (typeof value !== "string") {
    return "unknown";
  }
  return /fail|error/i.test(value) ? "failed" : "ok";
}

function parseSchedule(raw: unknown) {
  if (typeof raw === "string") {
    return { schedule: raw, scheduleText: describeCron(raw) };
  }
  const schedule = asRecord(raw);
  const expr = pickString(schedule.expr, schedule.cron);
  if (expr) {
    return { schedule: expr, scheduleText: describeCron(expr) };
  }
  if (typeof schedule.everyMs === "number") {
    return { schedule: `every ${schedule.everyMs}ms`, scheduleText: describeInterval(schedule.everyMs) };
  }
  const at = toIso(schedule.at ?? schedule.atMs);
  return at ? { schedule: `at ${at}`, scheduleText: `Once at ${at}` } : { schedule: "unknown", scheduleText: "unknown" };
}

function parseRuns(raw: unknown): CronRun[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((row): CronRun | null => {
      const run = asRecord(row);
      const at = toIso(run.at ?? run.started_at ?? run.startedAtMs ?? run.ts);
      return at
        ? { at, status: normalizeStatus(run.status), message: pickString(run.message, run.error) }
        : null;
    })
    .filter((run): run is CronRun => Boolean(run))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);
}

/**
 * Normalises one `openclaw cron list --json` row. Accepts both snake_case
 * fields and the nested `schedule` / `state` objects used by OpenClaw.
 */
export function parseCronRow(row: unknown, index: number, brandIds: string[]): CronEntry {
  const item = asRecord(row);
  const state = asRecord(item.state);
  const name = pickString(item.name, item.task, item.description) ?? `Cron ${index + 1}`;
  const recentRuns = parseRuns(item.runs ?? item.history ?? state.runs);
  const lastStatusRaw = item.last_status ?? item.lastStatus ?? state.lastStatus ?? recentRuns[0]?.status;
  const failures = item.consecutive_failures ?? item.consecutiveFailures ?? state.consecutiveErrors;

  const job: CronEntry = {
    id: pickString(item.id, item.jobId) ?? `cron-${index}`,
    name,
    ...parseSchedule(item.schedule ?? item.cron),
    nextRun: toIso(item.next_run ?? item.nextRun ?? state.nextRunAtMs),
    lastRun: toIso(item.last_run ?? item.lastRun ?? state.lastRunAtMs) ?? recentRuns[0]?.at,
    lastStatus: normalizeStatus(lastStatusRaw),
    enabled: item.enabled === undefined ? true : Boolean(item.enabled),
    group: pickString(item.group),
    brandId: pickString(item.brand, item.brand_id) ?? inferBrandId(`${item.id ?? ""} ${name}`, brandIds),
    jobType: inferJobType(`${name} ${pickString(item.task) ?? ""}`),
    consecutiveFailures: typeof failures === "number" ? failures : undefined,
    recentRuns,
  };

  return { ...job, health: computeCronHealth(job) };
}

function extractRows(parsed: unknown) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  const record = asRecord(parsed);
  return Array.isArray(record.jobs) ? record.jobs : [];
}

async function applyOverrides(jobs: CronEntry[]) {
  const overrides = await readJsonFile<Record<string, boolean>>(getPaths().cronOverridesPath, {});
  return jobs.map((job) => {
    if (overrides[job.id] === undefined) {
      return job;
    }
    const enabled = overrides[job.id];
    return { ...job, enabled, health: computeCronHealth({ ...job, enabled }) };
  });
}

/**
 * Lists cron jobs via the OpenClaw CLI, caching the last good snapshot so the
 * dashboard still renders when the gateway is down.
 */
export async function listCrons(): Promise<CronList> {
  const { cronStatePath } = getPaths();

  try {
    const [{ stdout }, brandIds] = await Promise.all([
      execFileAsync("openclaw", ["cron", "list", "--json"], { timeout: CLI_TIMEOUT_MS }),
      getBrandIds(),
    ]);
    const jobs = extractRows(JSON.parse(stdout)).map((row, index) => parseCronRow(row, index, brandIds));
    await writeJsonState(cronStatePath, jobs);
    return { jobs: await applyOverrides(jobs), stale: false };
  } catch (error) {
    const fallback = await readJsonFile<CronEntry[]>(cronStatePath, []);
    return {
      jobs: await applyOverrides(fallback),
      stale: true,
      error: error instanceof Error ? error.message : "Unable to list crons",
    };
  }
}

/**
 * Triggers an immediate run of a cron job.
 */
export async function runCron(id: string) {
  try {
    const { stdout } = await execFileAsync("openclaw", ["cron", "run", id], { timeout: CLI_TIMEOUT_MS });
    return { ok: true, id, output: stdout.trim() };
  } catch (error) {
    return { ok: false, id, error: error instanceof Error ? error.message : "failed to run cron" };
  }
}

/**
 * Enables/disables a job through the CLI. When the CLI rejects the command the
 * choice is kept as a dashboard override so it survives the next list call.
 */
export async function toggleCron(id: string, enabled: boolean) {
  const { cronOverridesPath } = getPaths();
  const overrides = await readJsonFile<Record<string, boolean>>(cronOverridesPath, {});

  try {
    await execFileAsync("openclaw", ["cron", enabled ? "enable" : "disable", id], {
      timeout: CLI_TIMEOUT_MS,
    });
    delete overrides[id];
    await writeJsonState(cronOverridesPath, overrides);
    return { ok: true, id, enabled, source: "openclaw" as const };
  } catch {
    overrides[id] = enabled;
    await writeJsonState(cronOverridesPath, overrides);
    return {
      ok: true,
      id,
      enabled,
      source: "dashboard" as const,
      note: "OpenClaw CLI unavailable; state saved as a dashboard override.",
    };
  }
}
