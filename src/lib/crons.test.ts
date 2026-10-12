import { describe, expect, it } from "vitest";

import { parseCronRow } from "@/lib/crons";

describe("parseCronRow", () => {
  it("parses snake_case rows with run history", () => {
    const job = parseCronRow(
      {
        id: "abc",
        name: "invoicerate publish",
        schedule: "0 9 * * *",
        last_status: "failed",
        runs: [
          { at: "2026-01-02T09:00:00Z", status: "error", error: "timeout" },
          { at: "2026-01-01T09:00:00Z", status: "ok" },
        ],
      },
      0,
      ["invoicerate"],
    );

    expect(job).toMatchObject({
      id: "abc",
      brandId: "invoicerate",
      jobType: "publish",
      scheduleText: "Daily at 09:00",
      lastStatus: "failed",
      lastRun: "2026-01-02T09:00:00Z",
      health: "yellow",
      enabled: true,
    });
    expect(job.recentRuns?.[0]).toEqual({ at: "2026-01-02T09:00:00Z", status: "failed", message: "timeout" });
  });

  it("parses OpenClaw nested schedule/state objects", () => {
    const job = parseCronRow(
      {
        id: "j1",
        name: "fessburn warmup",
        enabled: false,
        schedule: { kind: "cron", expr: "*/30 * * * *" },
        state: { nextRunAtMs: 0, lastRunAtMs: 1_000, lastStatus: "ok", consecutiveErrors: 0 },
      },
      0,
      ["fessburn"],
    );

    expect(job).toMatchObject({
      schedule: "*/30 * * * *",
      scheduleText: "Every 30 minutes",
      lastRun: new Date(1_000).toISOString(),
      nextRun: new Date(0).toISOString(),
      enabled: false,
      health: "grey",
      jobType: "warmup",
    });
  });
});
