import { describe, expect, it } from "vitest";

import { computeCronHealth, describeCron, describeInterval, inferBrandId, inferJobType } from "@/lib/cron-schedule";

describe("describeCron", () => {
  it.each([
    ["0 9 * * *", "Daily at 09:00"],
    ["30 9,13,18 * * *", "Daily at 09:30, 13:30, 18:30"],
    ["0 10 * * 1,3,5", "Mon, Wed, Fri at 10:00"],
    ["15 8 * * 1-5", "Weekdays at 08:15"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["5 */4 * * *", "Every 4 hours at :05"],
    ["7 * * * *", "Hourly at :07"],
    ["0 0 1 * *", "0 0 1 * *"],
    ["not a cron", "not a cron"],
  ])("%s -> %s", (expression, expected) => {
    expect(describeCron(expression)).toBe(expected);
  });

  it("describes intervals", () => {
    expect(describeInterval(30 * 60_000)).toBe("Every 30 minutes");
    expect(describeInterval(2 * 3_600_000)).toBe("Every 2 hour(s)");
    expect(describeInterval(86_400_000)).toBe("Every 1 day(s)");
  });
});

describe("classification", () => {
  it("infers job type and longest matching brand id", () => {
    expect(inferJobType("InvoiceRate Publish 09:00")).toBe("publish");
    expect(inferJobType("misc cleanup")).toBe("other");
    expect(inferBrandId("gideonawolesi-warmup", ["gideon", "gideonawolesi"])).toBe("gideonawolesi");
    expect(inferBrandId("unrelated", ["fessburn"])).toBeUndefined();
  });
});

describe("computeCronHealth", () => {
  const base = { enabled: true, lastStatus: "ok" as const, recentRuns: [] };

  it("is grey when disabled", () => {
    expect(computeCronHealth({ ...base, enabled: false })).toBe("grey");
  });
  it("is green after a good run and yellow after one failure", () => {
    expect(computeCronHealth(base)).toBe("green");
    expect(computeCronHealth({ ...base, lastStatus: "failed" })).toBe("yellow");
  });
  it("is red after 3 consecutive failures from counter or run history", () => {
    expect(computeCronHealth({ ...base, lastStatus: "failed", consecutiveFailures: 3 })).toBe("red");
    const failed = { at: "2026-01-01T00:00:00Z", status: "failed" as const };
    expect(computeCronHealth({ ...base, lastStatus: "failed", recentRuns: [failed, failed, failed] })).toBe("red");
  });
});
