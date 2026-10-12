import type { PublishEntry, PublishFilters } from "@/lib/types";

const CSV_COLUMNS: { header: string; value: (entry: PublishEntry) => string }[] = [
  { header: "date", value: (entry) => entry.date },
  { header: "time", value: (entry) => entry.time },
  { header: "brand", value: (entry) => entry.brandId },
  { header: "content_type", value: (entry) => entry.contentType },
  { header: "status", value: (entry) => (entry.ok ? "ok" : "failed") },
  { header: "platforms", value: (entry) => entry.postedTargets.join(";") },
  { header: "failed_platforms", value: (entry) => entry.failedTargets.join(";") },
  { header: "postiz_post_ids", value: (entry) => entry.postizPostIds.join(";") },
  { header: "caption", value: (entry) => entry.captionPreview ?? "" },
  { header: "report", value: (entry) => entry.reportPath },
];

/**
 * Applies brand/platform/content-type/date-range filters to publish history.
 */
export function filterPublishHistory(entries: PublishEntry[], filters: PublishFilters) {
  return entries.filter((entry) => {
    if (filters.brandId && entry.brandId !== filters.brandId) {
      return false;
    }
    if (
      filters.platform &&
      !entry.postedTargets.includes(filters.platform) &&
      !entry.failedTargets.includes(filters.platform)
    ) {
      return false;
    }
    if (filters.contentType && entry.contentType !== filters.contentType) {
      return false;
    }
    if (filters.from && entry.date < filters.from) {
      return false;
    }
    if (filters.to && entry.date > filters.to) {
      return false;
    }
    return true;
  });
}

/**
 * Reads publish filters from URL search params, ignoring empty values.
 */
export function parsePublishFilters(params: URLSearchParams): PublishFilters {
  const pick = (key: string) => params.get(key)?.trim() || undefined;
  return {
    brandId: pick("brand"),
    platform: pick("platform"),
    contentType: pick("contentType"),
    from: pick("from"),
    to: pick("to"),
  };
}

function escapeCsv(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serializes publish history to RFC 4180 CSV.
 */
export function publishHistoryToCsv(entries: PublishEntry[]) {
  const lines = [CSV_COLUMNS.map((column) => column.header).join(",")];
  for (const entry of entries) {
    lines.push(CSV_COLUMNS.map((column) => escapeCsv(column.value(entry))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
