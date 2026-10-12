import { getBrandList, listDrafts, listExperiments, listScripts } from "@/lib/brand-os";
import { listCrons } from "@/lib/crons";
import { listPublishHistory } from "@/lib/publishing";
import type {
  BrandStatus,
  CronEntry,
  DraftEntry,
  ExperimentEntry,
  PipelineAlert,
  PipelineBrand,
  PublishEntry,
  ScriptEntry,
  StageStatus,
  WarmupBrandStatus,
} from "@/lib/types";
import { slotTimestamp } from "@/lib/workspace";

const DAY_MS = 86_400_000;

export type PipelineInput = {
  brands: { id: string; status: BrandStatus }[];
  drafts: DraftEntry[];
  publishes: PublishEntry[];
  experiments: ExperimentEntry[];
  scripts: ScriptEntry[];
};

function latest(values: (string | null | undefined)[]) {
  const stamps = values.map((value) => Date.parse(value ?? "")).filter(Number.isFinite);
  return stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
}

function isPublished(status: string) {
  return /publish|posted/i.test(status);
}

function isFailed(status: string) {
  return /fail|error/i.test(status);
}

/**
 * Derives per-brand Generate → Draft → Publish → Analytics state and alerts.
 */
export function computePipeline(input: PipelineInput, now = Date.now()): PipelineBrand[] {
  const today = new Date(now).toISOString().slice(0, 10);

  return input.brands.map(({ id: brandId, status }) => {
    const active = status === "active";
    const idleOr = (value: StageStatus): StageStatus => (active ? value : "idle");
    const drafts = input.drafts.filter((draft) => draft.brandId === brandId);
    const publishes = input.publishes.filter((post) => post.brandId === brandId);
    const experiments = input.experiments.filter((row) => row.brand_id === brandId);
    const scripts = input.scripts.filter((script) => script.brandId === brandId);

    const draftTimes = drafts.map((draft) => draft.createdAt ?? new Date(slotTimestamp(draft.date, draft.slot)).toISOString());
    const lastGenerated = latest(draftTimes);
    const generatedRecently = drafts.filter((_, i) => now - (Date.parse(draftTimes[i]) || 0) < 2 * DAY_MS).length;

    const pending = drafts.filter((draft) => !isPublished(draft.status) && !isFailed(draft.status));
    const overdue = pending.filter((draft) => slotTimestamp(draft.date, draft.slot) + 30 * 60_000 < now);
    const failedDrafts = drafts.filter((draft) => isFailed(draft.status));

    const weekPublishes = publishes.filter((post) => now - slotTimestamp(post.date, post.slot) < 7 * DAY_MS);
    const weekFailures = weekPublishes.filter((post) => !post.ok);
    const lastPublished = latest(publishes.map((post) => new Date(slotTimestamp(post.date, post.slot)).toISOString()));

    const lastAnalytics = latest(experiments.map((row) => row.logged_at));
    const analyticsFresh = lastAnalytics !== null && now - Date.parse(lastAnalytics) < 7 * DAY_MS;

    const missingUploads = scripts.filter(
      (script) => script.status === "pending" && !script.hasMatchedVideo && script.date < today,
    );

    const alerts: PipelineAlert[] = [];
    if (overdue.length) {
      alerts.push({ severity: "warning", message: `${overdue.length} draft(s) past their slot without publish` });
    }
    if (failedDrafts.length) {
      alerts.push({ severity: "error", message: `${failedDrafts.length} failed generation/publish draft(s)` });
    }
    if (weekFailures.length) {
      alerts.push({ severity: "error", message: `${weekFailures.length} failed publish(es) in the last 7 days` });
    }
    if (missingUploads.length) {
      alerts.push({ severity: "warning", message: `${missingUploads.length} script(s) still waiting for a video upload` });
    }
    if (active && !generatedRecently) {
      alerts.push({ severity: "warning", message: "No drafts generated in the last 48 hours" });
    }

    return {
      brandId,
      alerts,
      stages: [
        {
          name: "Generate",
          value: generatedRecently,
          status: idleOr(generatedRecently ? "ok" : "warning"),
          detail: `${generatedRecently} in last 48h`,
          lastAt: lastGenerated,
        },
        {
          name: "Draft",
          value: pending.length,
          status: idleOr(failedDrafts.length ? "error" : overdue.length ? "warning" : "ok"),
          detail: `${pending.length} queued · ${overdue.length} overdue`,
          lastAt: lastGenerated,
        },
        {
          name: "Publish",
          value: weekPublishes.length - weekFailures.length,
          status: idleOr(weekFailures.length ? "error" : weekPublishes.length ? "ok" : "warning"),
          detail: `${weekPublishes.length - weekFailures.length} ok · ${weekFailures.length} failed (7d)`,
          lastAt: lastPublished,
        },
        {
          name: "Analytics",
          value: experiments.length,
          status: idleOr(analyticsFresh ? "ok" : "warning"),
          detail: analyticsFresh ? "Ingested this week" : "No ingest in 7 days",
          lastAt: lastAnalytics,
        },
      ],
    };
  });
}

/**
 * Loads pipeline inputs from disk and computes the monitor view.
 */
export async function getPipelineMonitor() {
  const [brands, drafts, publishes, experiments, scripts] = await Promise.all([
    getBrandList(),
    listDrafts(),
    listPublishHistory(),
    listExperiments(),
    listScripts(),
  ]);
  return computePipeline({ brands, drafts, publishes, experiments, scripts });
}

/**
 * Summarises warmup events per brand/platform with an hour-of-day histogram.
 */
export function computeWarmup(
  brandIds: string[],
  experiments: ExperimentEntry[],
  crons: CronEntry[],
  now = Date.now(),
): WarmupBrandStatus[] {
  return brandIds.map((brandId) => {
    const rows = experiments.filter(
      (row) => row.brand_id === brandId && String(row.source ?? "").includes("warmup") && row.logged_at,
    );
    const hourHistogram = Array.from({ length: 24 }, () => 0);
    const byPlatform = new Map<string, string[]>();

    for (const row of rows) {
      const stamp = row.logged_at as string;
      const date = new Date(stamp);
      if (Number.isFinite(date.getTime())) {
        hourHistogram[date.getUTCHours()] += 1;
      }
      const platform = typeof row.channel_id === "string" ? row.channel_id : "unknown";
      byPlatform.set(platform, [...(byPlatform.get(platform) ?? []), stamp]);
    }

    const lastWarmupAt = latest(rows.map((row) => row.logged_at));
    const cron = crons.find((job) => job.jobType === "warmup" && job.brandId === brandId);

    return {
      brandId,
      lastWarmupAt,
      status: !lastWarmupAt ? "unknown" : now - Date.parse(lastWarmupAt) < 2 * DAY_MS ? "ok" : "stale",
      platforms: [...byPlatform.entries()]
        .map(([platform, stamps]) => ({ platform, lastWarmupAt: latest(stamps), count: stamps.length }))
        .sort((a, b) => a.platform.localeCompare(b.platform)),
      hourHistogram,
      cronId: cron?.id ?? null,
    };
  });
}

/**
 * Loads warmup data (experiments + cron jobs) and computes per-brand status.
 */
export async function getWarmupStatus() {
  const [brands, experiments, crons] = await Promise.all([getBrandList(), listExperiments(), listCrons()]);
  return computeWarmup(
    brands.map((brand) => brand.id),
    experiments,
    crons.jobs,
  );
}
