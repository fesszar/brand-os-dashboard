import { rowEngagement, rowString, rowViews, totals, twoProportionTest } from "@/lib/analytics-math";
import type { ExperimentEntry } from "@/lib/types";

export type ExperimentStatus = "active" | "archived";

export type VariantResult = {
  variant: string;
  posts: number;
  views: number;
  engagement: number;
  engagementRate: number;
  lift: number | null;
  pValue: number | null;
  significant: boolean;
};

export type Experiment = {
  id: string;
  brandId: string;
  hypothesis: string;
  metric: string;
  status: ExperimentStatus;
  createdAt: string | null;
  variants: VariantResult[];
  winner: string | null;
};

export const SIGNIFICANCE_LEVEL = 0.05;

/**
 * Stable id for legacy rows that only carry a hypothesis string.
 */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function experimentId(row: ExperimentEntry) {
  const explicit = rowString(row, "experiment_id");
  if (explicit) {
    return explicit;
  }
  return typeof row.hypothesis === "string" && row.hypothesis.trim() ? slugify(row.hypothesis) : undefined;
}

/**
 * Builds experiments from experiments.jsonl rows:
 * - `type: "experiment"` rows define hypothesis/metric/variants,
 * - `type: "experiment_status"` rows change status (latest wins),
 * - rows with an aggregate and `variant` (or channel) are results.
 * Each non-control variant is tested against the first variant with a
 * two-proportion z-test on engagement / views.
 */
export function buildExperiments(rows: ExperimentEntry[]): Experiment[] {
  const sorted = [...rows].sort((a, b) => (Date.parse(a.logged_at ?? "") || 0) - (Date.parse(b.logged_at ?? "") || 0));
  const experiments = new Map<string, { def: Partial<Experiment>; variantOrder: string[]; results: Map<string, ExperimentEntry[]> }>();

  const ensure = (id: string, row: ExperimentEntry) => {
    if (!experiments.has(id)) {
      experiments.set(id, {
        def: {
          id,
          brandId: row.brand_id ?? "unknown",
          hypothesis: typeof row.hypothesis === "string" ? row.hypothesis : id,
          metric: typeof row.metric === "string" ? row.metric : "engagement_rate",
          status: "active",
          createdAt: row.logged_at ?? null,
        },
        variantOrder: [],
        results: new Map(),
      });
    }
    return experiments.get(id)!;
  };

  for (const row of sorted) {
    const id = experimentId(row);
    if (!id) {
      continue;
    }
    const entry = ensure(id, row);

    if (row.type === "experiment_status") {
      entry.def.status = row.status === "archived" ? "archived" : "active";
      continue;
    }
    if (row.type === "experiment") {
      entry.def = { ...entry.def, hypothesis: (row.hypothesis as string) ?? entry.def.hypothesis, createdAt: row.logged_at ?? entry.def.createdAt };
      if (typeof row.metric === "string") {
        entry.def.metric = row.metric;
      }
      if (Array.isArray(row.variants)) {
        entry.variantOrder = (row.variants as unknown[]).filter((v): v is string => typeof v === "string");
      }
      continue;
    }
    if (row.aggregate) {
      const variant = rowString(row, "variant", "channel_id") ?? "all";
      entry.results.set(variant, [...(entry.results.get(variant) ?? []), row]);
      if (!entry.variantOrder.includes(variant)) {
        entry.variantOrder.push(variant);
      }
    }
  }

  return [...experiments.values()].map(({ def, variantOrder, results }) => {
    const stats = variantOrder.map((variant) => {
      const group = results.get(variant) ?? [];
      return {
        variant,
        sum: totals(group),
        successes: group.reduce((acc, row) => acc + rowEngagement(row), 0),
        trials: group.reduce((acc, row) => acc + rowViews(row), 0),
      };
    });
    const control = stats[0];

    const variants: VariantResult[] = stats.map((stat, index) => {
      const test = index === 0 || !control ? null : twoProportionTest(control, stat);
      return {
        variant: stat.variant,
        posts: stat.sum.posts,
        views: stat.sum.views,
        engagement: stat.sum.engagement,
        engagementRate: stat.sum.engagementRate,
        lift: test?.lift ?? null,
        pValue: test?.pValue ?? null,
        significant: Boolean(test && test.pValue < SIGNIFICANCE_LEVEL),
      };
    });

    const significantWinners = variants.filter((v) => v.significant && (v.lift ?? 0) > 0).sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0));
    const controlBeatsAll = variants.length > 1 && variants.slice(1).every((v) => v.significant && (v.lift ?? 0) < 0);

    return {
      ...(def as Experiment),
      variants,
      winner: significantWinners[0]?.variant ?? (controlBeatsAll ? variants[0].variant : null),
    };
  });
}

/**
 * Validates a create-experiment payload and returns the jsonl definition row.
 */
export function buildDefinitionRow(
  input: { brandId?: unknown; hypothesis?: unknown; metric?: unknown; variants?: unknown },
  existingIds: string[],
  now = new Date(),
) {
  if (typeof input.hypothesis !== "string" || input.hypothesis.trim().length < 5) {
    throw new Error("hypothesis must be at least 5 characters");
  }
  const variants = Array.isArray(input.variants)
    ? [...new Set(input.variants.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))]
    : [];
  if (variants.length < 2) {
    throw new Error("provide at least two distinct variants (first is the control)");
  }

  const base = slugify(input.hypothesis) || "experiment";
  let id = base;
  for (let n = 2; existingIds.includes(id); n += 1) {
    id = `${base}-${n}`;
  }

  return {
    logged_at: now.toISOString(),
    brand_id: input.brandId as string,
    source: "dashboard",
    type: "experiment",
    experiment_id: id,
    hypothesis: input.hypothesis.trim(),
    metric: typeof input.metric === "string" && input.metric ? input.metric : "engagement_rate",
    variants,
    status: "active",
  };
}
