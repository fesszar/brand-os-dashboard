import { describe, expect, it } from "vitest";

import { computeBrandPerformance, computeCrossBrand, computeFunnel, weekStart } from "@/lib/analytics";
import { normalCdf, totals, twoProportionTest } from "@/lib/analytics-math";
import type { ExperimentEntry } from "@/lib/types";

const row = (overrides: Partial<ExperimentEntry> & Record<string, unknown>): ExperimentEntry => ({
  brand_id: "invoicerate",
  channel_id: "tiktok",
  logged_at: "2026-02-10T09:00:00Z",
  aggregate: { views: 1000, engagement: 50, posts: 1 },
  ...overrides,
});

describe("analytics math", () => {
  it("pools engagement rate and derives engagement from components", () => {
    const sum = totals([
      row({}),
      row({ aggregate: { views: 3000, likes: 100, comments: 20, shares: 5, saves: 5 } }),
    ]);
    expect(sum).toMatchObject({ rows: 2, posts: 2, views: 4000, engagement: 180 });
    expect(sum.engagementRate).toBeCloseTo(0.045);
  });

  it("derives engagement from a logged rate when counts are missing", () => {
    const sum = totals([row({ aggregate: { views: 1200, engagement_rate: 0.05 } }), row({})]);
    expect(sum.engagement).toBeCloseTo(110);
    expect(sum.engagementRate).toBeCloseTo(110 / 2200);
  });

  it("falls back to mean logged rate without views", () => {
    expect(totals([row({ aggregate: { engagement_rate: 0.1 } }), row({ aggregate: { engagement_rate: 0.2 } })]).engagementRate).toBeCloseTo(0.15);
  });

  it("computes normal CDF and a two-proportion test", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    const strong = twoProportionTest({ successes: 50, trials: 1000 }, { successes: 90, trials: 1000 })!;
    expect(strong.pValue).toBeLessThan(0.01);
    expect(strong.lift).toBeCloseTo(0.8);
    expect(twoProportionTest({ successes: 50, trials: 1000 }, { successes: 52, trials: 1000 })!.pValue).toBeGreaterThan(0.5);
    expect(twoProportionTest({ successes: 0, trials: 0 }, { successes: 1, trials: 10 })).toBeNull();
  });
});

describe("computeCrossBrand", () => {
  it("summarises brands, best combo, content types and hourly rates", () => {
    const result = computeCrossBrand(
      ["invoicerate", "fessburn", "empty"],
      [
        row({ content_type: "video" }),
        row({ channel_id: "instagram", aggregate: { views: 1000, engagement: 120 }, content_type: "ai_slideshow" }),
        row({ brand_id: "fessburn", logged_at: "2026-02-10T18:30:00Z", aggregate: { views: 5000, engagement: 100 } }),
        row({ type: "experiment", aggregate: undefined }),
      ],
    );

    expect(result.brands.map((b) => [b.brandId, b.views])).toEqual([
      ["fessburn", 5000],
      ["invoicerate", 2000],
      ["empty", 0],
    ]);
    expect(result.bestCombo).toMatchObject({ brandId: "invoicerate", platform: "instagram" });
    expect(result.contentTypes.map((c) => c.name)).toEqual(["ai_slideshow", "video", "unknown"]);
    expect(result.hourly.find((h) => h.brandId === "fessburn")!.rates[18]).toBeCloseTo(0.02);
    expect(result.hourly.find((h) => h.brandId === "fessburn")!.rates[9]).toBeNull();
  });
});

describe("computeBrandPerformance", () => {
  it("builds a chronological daily series and angle ranking", () => {
    const perf = computeBrandPerformance("invoicerate", [
      row({ logged_at: "2026-02-12T09:00:00Z", angle_name: "Late fees", aggregate: { views: 100, engagement: 20 } }),
      row({ logged_at: "2026-02-10T09:00:00Z", angle_name: "Rate card", aggregate: { views: 100, engagement: 5 } }),
      row({ brand_id: "fessburn" }),
    ]);
    expect(perf.daily.map((d) => d.date)).toEqual(["2026-02-10", "2026-02-12"]);
    expect(perf.angles.map((a) => a.name)).toEqual(["Late fees", "Rate card"]);
    expect(perf.platforms[0].name).toBe("tiktok");
  });
});

describe("computeFunnel", () => {
  it("uses logged numbers only and compares stages to target weights", () => {
    const storybook = { funnel: { stages: [{ name: "awareness", weight: 0.6 }, { name: "conversion", weight: 0.4 }] } };
    const funnel = computeFunnel("gideonawolesi", storybook, [
      row({ brand_id: "gideonawolesi", funnel_stage: "awareness", cta: "DM me AI", aggregate: { views: 1000, engagement: 40, profile_visits: 30, dms: 4, leads: 1 } }),
      row({ brand_id: "gideonawolesi", funnel_stage: "conversion", cta: "Book a call", logged_at: "2026-02-17T09:00:00Z", aggregate: { views: 500, engagement: 25, dms: 6, leads: 3, clients: 1 } }),
    ]);

    expect(funnel.stages.map((s) => [s.stage, s.targetWeight, s.shareOfPosts])).toEqual([
      ["awareness", 0.6, 0.5],
      ["conversion", 0.4, 0.5],
    ]);
    expect(funnel.ctas[0]).toMatchObject({ cta: "Book a call", dms: 6, leads: 3, dmsPerPost: 6 });
    expect(funnel.conversion).toEqual([
      { step: "Views", value: 1500 },
      { step: "Profile visits", value: 30 },
      { step: "DMs", value: 10 },
      { step: "Leads", value: 4 },
      { step: "Clients", value: 1 },
    ]);
    expect(funnel.weekly).toEqual([
      { week: "2026-02-16", dms: 6, leads: 3, clients: 1 },
      { week: "2026-02-09", dms: 4, leads: 1, clients: 0 },
    ]);
  });

  it("returns zeros, not estimates, with no data", () => {
    const funnel = computeFunnel("gideonawolesi", null, []);
    expect(funnel.ctas).toEqual([]);
    expect(funnel.conversion.every((step) => step.value === 0)).toBe(true);
    expect(weekStart("2026-02-15T23:00:00Z")).toBe("2026-02-09");
  });
});
