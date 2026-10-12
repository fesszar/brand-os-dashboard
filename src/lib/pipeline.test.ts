import { describe, expect, it } from "vitest";

import { computePipeline, computeWarmup, type PipelineInput } from "@/lib/pipeline";
import type { CronEntry, DraftEntry, PublishEntry, ScriptEntry } from "@/lib/types";

const NOW = Date.parse("2026-02-15T12:00:00");

const draft = (overrides: Partial<DraftEntry>): DraftEntry => ({
  brandId: "invoicerate",
  slotDir: "2026-02-15-0900",
  date: "2026-02-15",
  slot: "0900",
  status: "scheduled",
  createdAt: "2026-02-15T06:00:00",
  targets: [],
  hasVideo: false,
  ...overrides,
});

const input = (overrides: Partial<PipelineInput>): PipelineInput => ({
  brands: [{ id: "invoicerate", status: "active" }],
  drafts: [],
  publishes: [],
  experiments: [],
  scripts: [],
  ...overrides,
});

describe("computePipeline", () => {
  it("flags overdue drafts, failed publishes, missing uploads and stale analytics", () => {
    const [brand] = computePipeline(
      input({
        drafts: [draft({}), draft({ slotDir: "2026-02-15-1800", slot: "1800" })],
        publishes: [{ brandId: "invoicerate", date: "2026-02-14", slot: "0900", ok: false } as PublishEntry],
        scripts: [{ brandId: "invoicerate", date: "2026-02-13", status: "pending", hasMatchedVideo: false } as ScriptEntry],
      }),
      NOW,
    );

    const byName = Object.fromEntries(brand.stages.map((stage) => [stage.name, stage]));
    expect(byName.Generate).toMatchObject({ value: 2, status: "ok" });
    expect(byName.Draft).toMatchObject({ value: 2, status: "warning", detail: "2 queued · 1 overdue" });
    expect(byName.Publish.status).toBe("error");
    expect(byName.Analytics.status).toBe("warning");
    expect(brand.alerts.map((alert) => alert.message)).toEqual([
      "1 draft(s) past their slot without publish",
      "1 failed publish(es) in the last 7 days",
      "1 script(s) still waiting for a video upload",
    ]);
  });

  it("is healthy with recent publishes and analytics", () => {
    const [brand] = computePipeline(
      input({
        drafts: [draft({ status: "published" })],
        publishes: [{ brandId: "invoicerate", date: "2026-02-15", slot: "0900", ok: true } as PublishEntry],
        experiments: [{ brand_id: "invoicerate", logged_at: "2026-02-14T10:00:00Z" }],
      }),
      NOW,
    );
    expect(brand.stages.every((stage) => stage.status === "ok")).toBe(true);
    expect(brand.alerts).toEqual([]);
  });

  it("marks inactive brands idle without the generation alert", () => {
    const [brand] = computePipeline(input({ brands: [{ id: "rottenswamp", status: "decommissioned" }] }), NOW);
    expect(brand.stages.every((stage) => stage.status === "idle")).toBe(true);
    expect(brand.alerts).toEqual([]);
  });
});

describe("computeWarmup", () => {
  it("groups by platform, builds an hour histogram and maps the warmup cron", () => {
    const experiments = [
      { brand_id: "fessburn", source: "warmup", channel_id: "tiktok", logged_at: "2026-02-15T09:10:00Z" },
      { brand_id: "fessburn", source: "warmup", channel_id: "tiktok", logged_at: "2026-02-14T09:40:00Z" },
      { brand_id: "fessburn", source: "warmup", channel_id: "instagram", logged_at: "2026-02-10T21:00:00Z" },
      { brand_id: "fessburn", source: "analytics", logged_at: "2026-02-15T11:00:00Z" },
    ];
    const crons = [{ id: "w1", jobType: "warmup", brandId: "fessburn" } as CronEntry];

    const [fessburn, other] = computeWarmup(["fessburn", "relaystack"], experiments, crons, NOW);

    expect(fessburn.status).toBe("ok");
    expect(fessburn.lastWarmupAt).toBe("2026-02-15T09:10:00.000Z");
    expect(fessburn.cronId).toBe("w1");
    expect(fessburn.hourHistogram[9]).toBe(2);
    expect(fessburn.hourHistogram[21]).toBe(1);
    expect(fessburn.platforms).toEqual([
      { platform: "instagram", lastWarmupAt: "2026-02-10T21:00:00.000Z", count: 1 },
      { platform: "tiktok", lastWarmupAt: "2026-02-15T09:10:00.000Z", count: 2 },
    ]);
    expect(other).toMatchObject({ status: "unknown", cronId: null, lastWarmupAt: null });
  });
});
