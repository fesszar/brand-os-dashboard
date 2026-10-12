import type { ExperimentEntry } from "@/lib/types";

export type MetricTotals = {
  rows: number;
  posts: number;
  views: number;
  engagement: number;
  engagementRate: number;
};

export function rowViews(row: ExperimentEntry) {
  return row.aggregate?.views ?? row.aggregate?.impressions ?? 0;
}

/**
 * Engagement for one row: explicit `engagement`, else likes+comments+shares+saves,
 * else a logged `engagement_rate` × views for rows that only record the rate.
 */
export function rowEngagement(row: ExperimentEntry) {
  const agg = row.aggregate;
  if (!agg) {
    return 0;
  }
  if (typeof agg.engagement === "number") {
    return agg.engagement;
  }
  const parts = [agg.likes, agg.comments, agg.shares, agg.saves];
  if (parts.some((value) => typeof value === "number")) {
    return parts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  }
  return typeof agg.engagement_rate === "number" ? agg.engagement_rate * rowViews(row) : 0;
}

/**
 * Reads a numeric funnel/conversion field from the aggregate or the row itself.
 */
export function rowNumber(row: ExperimentEntry, key: string) {
  const fromAggregate = (row.aggregate as Record<string, unknown> | undefined)?.[key];
  const value = typeof fromAggregate === "number" ? fromAggregate : row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function rowString(row: ExperimentEntry, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Sums views/engagement across rows. Rate is pooled (engagement / views) so
 * heavy posts weigh more; falls back to the mean logged rate without views.
 */
export function totals(rows: ExperimentEntry[]): MetricTotals {
  const withData = rows.filter((row) => row.aggregate);
  const views = withData.reduce((sum, row) => sum + rowViews(row), 0);
  const engagement = withData.reduce((sum, row) => sum + rowEngagement(row), 0);
  const posts = withData.reduce((sum, row) => sum + (row.aggregate?.posts ?? 1), 0);
  const loggedRates = withData
    .map((row) => row.aggregate?.engagement_rate)
    .filter((value): value is number => typeof value === "number");

  return {
    rows: withData.length,
    posts,
    views,
    engagement,
    engagementRate:
      views > 0
        ? engagement / views
        : loggedRates.length
          ? loggedRates.reduce((sum, value) => sum + value, 0) / loggedRates.length
          : 0,
  };
}

/**
 * Groups rows by a key function, dropping rows whose key is undefined.
 */
export function groupBy<T>(rows: T[], key: (row: T) => string | undefined) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    if (value !== undefined) {
      groups.set(value, [...(groups.get(value) ?? []), row]);
    }
  }
  return groups;
}

/**
 * Standard normal CDF via the Abramowitz–Stegun erf approximation.
 */
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-((z / Math.SQRT2) ** 2));
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Two-proportion z-test (two-sided) comparing success rates of a variant
 * against a control. Returns null when either side has no trials.
 */
export function twoProportionTest(
  control: { successes: number; trials: number },
  variant: { successes: number; trials: number },
) {
  if (control.trials <= 0 || variant.trials <= 0) {
    return null;
  }
  const p1 = control.successes / control.trials;
  const p2 = variant.successes / variant.trials;
  const pooled = (control.successes + variant.successes) / (control.trials + variant.trials);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.trials + 1 / variant.trials));
  if (se === 0) {
    return { z: 0, pValue: 1, lift: p1 === 0 ? 0 : (p2 - p1) / p1 };
  }
  const z = (p2 - p1) / se;
  return { z, pValue: 2 * (1 - normalCdf(Math.abs(z))), lift: p1 === 0 ? 0 : (p2 - p1) / p1 };
}
