import { describe, expect, it } from "vitest";

import { filterPublishHistory, parsePublishFilters, publishHistoryToCsv } from "@/lib/publish-filters";
import { parsePublishReport } from "@/lib/publishing";
import type { PublishEntry } from "@/lib/types";

const entry = (overrides: Partial<PublishEntry>): PublishEntry => ({
  id: "x",
  brandId: "invoicerate",
  date: "2026-02-10",
  time: "09:00",
  slot: "0900",
  slotDir: "2026-02-10-0900",
  contentType: "ai_slideshow",
  postedTargets: ["tiktok"],
  failedTargets: [],
  ok: true,
  captions: {},
  postizPostIds: [],
  reportFile: "publish-result-1.json",
  reportPath: "brand-marketing/drafts/invoicerate/2026-02-10-0900/publish-result-1.json",
  ...overrides,
});

describe("parsePublishReport", () => {
  it("falls back to the slot directory for brand/date/slot", () => {
    const parsed = parsePublishReport(
      "/ws/brand-marketing/drafts/fessburn/2026-02-11-1330/publish-result-a.json",
      { ok: true, posted_targets: ["instagram"], failed_targets: ["tiktok"], postiz_response: [{ postId: "p1" }, {}] },
      { instagram: "IG caption", tiktok: "TT caption" },
    );

    expect(parsed).toMatchObject({
      brandId: "fessburn",
      date: "2026-02-11",
      slot: "1330",
      time: "13:30",
      slotDir: "2026-02-11-1330",
      failedTargets: ["tiktok"],
      postizPostIds: ["p1"],
      captionPreview: "IG caption",
      reportFile: "publish-result-a.json",
    });
  });
});

describe("filterPublishHistory", () => {
  const entries = [
    entry({ id: "a" }),
    entry({ id: "b", brandId: "fessburn", date: "2026-02-12", postedTargets: ["instagram"], contentType: "video" }),
    entry({ id: "c", date: "2026-02-14", postedTargets: [], failedTargets: ["instagram"] }),
  ];
  const ids = (filters: Parameters<typeof filterPublishHistory>[1]) =>
    filterPublishHistory(entries, filters).map((e) => e.id);

  it("filters by brand, platform (incl. failures), type and inclusive date range", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(ids({ brandId: "fessburn" })).toEqual(["b"]);
    expect(ids({ platform: "instagram" })).toEqual(["b", "c"]);
    expect(ids({ contentType: "video" })).toEqual(["b"]);
    expect(ids({ from: "2026-02-12", to: "2026-02-12" })).toEqual(["b"]);
  });

  it("parses URL params ignoring blanks", () => {
    expect(parsePublishFilters(new URLSearchParams("brand=fessburn&platform=&from=2026-01-01"))).toEqual({
      brandId: "fessburn",
      platform: undefined,
      contentType: undefined,
      from: "2026-01-01",
      to: undefined,
    });
  });
});

describe("publishHistoryToCsv", () => {
  it("writes a header and escapes quotes, commas and newlines", () => {
    const csv = publishHistoryToCsv([entry({ captionPreview: 'Say "hi", then\nleave' })]);
    const [header, row] = csv.split("\r\n");
    expect(header.startsWith("date,time,brand,content_type,status")).toBe(true);
    expect(csv).toContain('"Say ""hi"", then\nleave"');
    expect(row.startsWith("2026-02-10,09:00,invoicerate,ai_slideshow,ok,tiktok")).toBe(true);
  });
});
