import {
  groupBy,
  rowNumber,
  rowString,
  rowViews,
  totals,
  type MetricTotals,
} from "@/lib/analytics-math";
import type { ExperimentEntry } from "@/lib/types";

export type BrandSummary = MetricTotals & { brandId: string };
export type ComboSummary = MetricTotals & { brandId: string; platform: string };
export type NamedSummary = MetricTotals & { name: string };

export type CrossBrandAnalytics = {
  brands: BrandSummary[];
  bestCombo: ComboSummary | null;
  contentTypes: NamedSummary[];
  /** brandId -> 24 hourly engagement rates (null where no posts). */
  hourly: { brandId: string; rates: (number | null)[] }[];
};

export type DailyPoint = { date: string; views: number; engagementRate: number; posts: number };

export type BrandPerformance = {
  brandId: string;
  totals: MetricTotals;
  daily: DailyPoint[];
  platforms: NamedSummary[];
  angles: NamedSummary[];
};

function isMetricRow(row: ExperimentEntry) {
  return Boolean(row.aggregate) && row.type !== "experiment" && row.type !== "experiment_status";
}

function rowTime(row: ExperimentEntry) {
  return rowString(row, "posted_at", "logged_at");
}

function summarise(groups: Map<string, ExperimentEntry[]>): NamedSummary[] {
  return [...groups.entries()]
    .map(([name, rows]) => ({ name, ...totals(rows) }))
    .sort((a, b) => b.engagementRate - a.engagementRate);
}

/**
 * Side-by-side brand metrics, best brand×platform, content-type comparison
 * and hour-of-day engagement (UTC) across all brands.
 */
export function computeCrossBrand(brandIds: string[], experiments: ExperimentEntry[]): CrossBrandAnalytics {
  const rows = experiments.filter(isMetricRow);
  const byBrand = groupBy(rows, (row) => row.brand_id);

  const combos = [...groupBy(rows, (row) => (row.brand_id && row.channel_id ? `${row.brand_id}|${row.channel_id}` : undefined))]
    .map(([key, group]) => {
      const [brandId, platform] = key.split("|");
      return { brandId, platform, ...totals(group) };
    })
    .filter((combo) => combo.views > 0)
    .sort((a, b) => b.engagementRate - a.engagementRate);

  return {
    brands: brandIds
      .map((brandId) => ({ brandId, ...totals(byBrand.get(brandId) ?? []) }))
      .sort((a, b) => b.views - a.views),
    bestCombo: combos[0] ?? null,
    contentTypes: summarise(groupBy(rows, (row) => rowString(row, "content_type") ?? "unknown")),
    hourly: brandIds.map((brandId) => {
      const byHour = groupBy(byBrand.get(brandId) ?? [], (row) => {
        const hour = new Date(rowTime(row) ?? "").getUTCHours();
        return Number.isFinite(hour) ? String(hour) : undefined;
      });
      return {
        brandId,
        rates: Array.from({ length: 24 }, (_, hour) => {
          const group = byHour.get(String(hour));
          return group ? totals(group).engagementRate : null;
        }),
      };
    }),
  };
}

/**
 * Daily views/engagement series plus platform and angle breakdowns for one brand.
 */
export function computeBrandPerformance(brandId: string, experiments: ExperimentEntry[]): BrandPerformance {
  const rows = experiments.filter((row) => isMetricRow(row) && row.brand_id === brandId);
  const byDay = groupBy(rows, (row) => rowTime(row)?.slice(0, 10));

  return {
    brandId,
    totals: totals(rows),
    daily: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-60)
      .map(([date, group]) => {
        const sum = totals(group);
        return { date, views: sum.views, engagementRate: sum.engagementRate, posts: sum.posts };
      }),
    platforms: summarise(groupBy(rows, (row) => rowString(row, "channel_id", "platform") ?? "unknown")),
    angles: summarise(groupBy(rows, (row) => rowString(row, "angle_name", "angle_id", "angle"))),
  };
}

export type FunnelAnalytics = {
  brandId: string;
  stages: (MetricTotals & { stage: string; targetWeight: number | null; shareOfPosts: number })[];
  ctas: { cta: string; posts: number; dms: number; leads: number; dmsPerPost: number }[];
  conversion: { step: string; value: number }[];
  weekly: { week: string; dms: number; leads: number; clients: number }[];
};

const CONVERSION_STEPS = [
  ["Views", "views"],
  ["Profile visits", "profile_visits"],
  ["DMs", "dms"],
  ["Leads", "leads"],
  ["Clients", "clients"],
] as const;

/**
 * Monday-based ISO-ish week label (yyyy-MM-dd of the week's Monday, UTC).
 */
export function weekStart(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return undefined;
  }
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function stageWeights(storybook: Record<string, unknown> | null) {
  const funnel = storybook?.funnel;
  const weights = new Map<string, number>();
  if (!funnel || typeof funnel !== "object") {
    return weights;
  }
  const record = funnel as Record<string, unknown>;
  if (Array.isArray(record.stages)) {
    for (const stage of record.stages as { name?: unknown; weight?: unknown }[]) {
      if (typeof stage?.name === "string" && typeof stage.weight === "number") {
        weights.set(stage.name, stage.weight);
      }
    }
  }
  const objectWeights = record.stage_weights;
  if (objectWeights && typeof objectWeights === "object") {
    for (const [name, weight] of Object.entries(objectWeights as Record<string, unknown>)) {
      if (typeof weight === "number") {
        weights.set(name, weight);
      }
    }
  }
  return weights;
}

/**
 * Funnel stage, CTA, conversion and weekly lead metrics from logged rows only;
 * missing fields count as zero rather than being estimated.
 */
export function computeFunnel(
  brandId: string,
  storybook: Record<string, unknown> | null,
  experiments: ExperimentEntry[],
): FunnelAnalytics {
  const rows = experiments.filter((row) => isMetricRow(row) && row.brand_id === brandId);
  const weights = stageWeights(storybook);
  const byStage = groupBy(rows, (row) => rowString(row, "funnel_stage"));
  const stageNames = [...new Set([...weights.keys(), ...byStage.keys()])];
  const stagedPosts = [...byStage.values()].reduce((sum, group) => sum + totals(group).posts, 0);
  const sum = (group: ExperimentEntry[], key: string) => group.reduce((acc, row) => acc + rowNumber(row, key), 0);

  return {
    brandId,
    stages: stageNames.map((stage) => {
      const stageTotals = totals(byStage.get(stage) ?? []);
      return {
        stage,
        ...stageTotals,
        targetWeight: weights.get(stage) ?? null,
        shareOfPosts: stagedPosts ? stageTotals.posts / stagedPosts : 0,
      };
    }),
    ctas: [...groupBy(rows, (row) => rowString(row, "cta"))]
      .map(([cta, group]) => {
        const posts = totals(group).posts;
        const dms = sum(group, "dms");
        return { cta, posts, dms, leads: sum(group, "leads"), dmsPerPost: posts ? dms / posts : 0 };
      })
      .sort((a, b) => b.dms - a.dms),
    conversion: CONVERSION_STEPS.map(([step, key]) => ({
      step,
      value: key === "views" ? rows.reduce((acc, row) => acc + rowViews(row), 0) : sum(rows, key),
    })),
    weekly: [...groupBy(rows, (row) => weekStart(rowTime(row) ?? ""))]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([week, group]) => ({ week, dms: sum(group, "dms"), leads: sum(group, "leads"), clients: sum(group, "clients") })),
  };
}
