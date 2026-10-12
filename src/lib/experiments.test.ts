import { describe, expect, it } from "vitest";

import { buildDefinitionRow, buildExperiments, slugify } from "@/lib/experiments";
import type { ExperimentEntry } from "@/lib/types";

const def: ExperimentEntry = {
  logged_at: "2026-02-01T00:00:00Z",
  brand_id: "invoicerate",
  type: "experiment",
  experiment_id: "hook-length",
  hypothesis: "Shorter hooks lift engagement",
  variants: ["long", "short"],
};
const result = (variant: string, views: number, engagement: number, at = "2026-02-02T00:00:00Z"): ExperimentEntry => ({
  logged_at: at,
  brand_id: "invoicerate",
  experiment_id: "hook-length",
  variant,
  aggregate: { views, engagement, posts: 1 },
});

describe("buildExperiments", () => {
  it("tests variants against the control and picks a significant winner", () => {
    const [experiment] = buildExperiments([def, result("long", 2000, 80), result("short", 2000, 160)]);
    expect(experiment).toMatchObject({ id: "hook-length", status: "active", metric: "engagement_rate", winner: "short" });
    expect(experiment.variants[0]).toMatchObject({ variant: "long", lift: null, pValue: null, significant: false });
    expect(experiment.variants[1].significant).toBe(true);
    expect(experiment.variants[1].lift).toBeCloseTo(1);
  });

  it("reports no winner when the difference is not significant, and keeps declared variant order", () => {
    const [experiment] = buildExperiments([result("short", 200, 9), def, result("long", 200, 8)]);
    expect(experiment.variants.map((v) => v.variant)).toEqual(["long", "short"]);
    expect(experiment.winner).toBeNull();
  });

  it("applies the latest status row", () => {
    const archived = { logged_at: "2026-02-03T00:00:00Z", type: "experiment_status", experiment_id: "hook-length", status: "archived" };
    const reopened = { ...archived, logged_at: "2026-02-04T00:00:00Z", status: "active" };
    expect(buildExperiments([def, archived])[0].status).toBe("archived");
    expect(buildExperiments([def, reopened, archived])[0].status).toBe("active");
  });

  it("groups legacy hypothesis rows by slug", () => {
    const legacy = buildExperiments([
      { hypothesis: "Carousel beats video", channel_id: "tiktok", aggregate: { views: 10, engagement: 1 } },
      { hypothesis: "Carousel beats video", channel_id: "instagram", aggregate: { views: 10, engagement: 2 } },
    ]);
    expect(legacy).toHaveLength(1);
    expect(legacy[0].id).toBe("carousel-beats-video");
    expect(legacy[0].variants.map((v) => v.variant)).toEqual(["tiktok", "instagram"]);
  });
});

describe("buildDefinitionRow", () => {
  it("validates input, dedupes variants and makes ids unique", () => {
    const row = buildDefinitionRow(
      { brandId: "fessburn", hypothesis: "Hook length matters!", variants: ["a", " b ", "a"] },
      ["hook-length-matters"],
      new Date("2026-02-01T00:00:00Z"),
    );
    expect(row).toMatchObject({ experiment_id: "hook-length-matters-2", variants: ["a", "b"], type: "experiment", status: "active" });
    expect(() => buildDefinitionRow({ hypothesis: "abc", variants: ["a", "b"] }, [])).toThrow(/hypothesis/);
    expect(() => buildDefinitionRow({ hypothesis: "valid hypothesis", variants: ["a"] }, [])).toThrow(/two distinct/);
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
  });
});
