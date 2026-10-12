import path from "node:path";

import type { PublishEntry } from "@/lib/types";
import {
  asRecord,
  getPaths,
  listFilesRecursive,
  pathExists,
  readJsonFile,
  slotTimestamp,
  toRelativeWorkspacePath,
} from "@/lib/workspace";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Builds a PublishEntry from a publish-result payload plus the slot's captions.
 */
export function parsePublishReport(
  reportPath: string,
  payload: Record<string, unknown>,
  captions: Record<string, string>,
): PublishEntry {
  const slotDir = path.basename(path.dirname(reportPath));
  const brandId =
    typeof payload.brand_id === "string"
      ? payload.brand_id
      : path.basename(path.dirname(path.dirname(reportPath)));
  const slotMatch = slotDir.match(/^(\d{4}-\d{2}-\d{2})-(\d{4})$/);
  const date = typeof payload.date === "string" ? payload.date : (slotMatch?.[1] ?? "unknown");
  const slot = typeof payload.slot === "string" ? payload.slot : (slotMatch?.[2] ?? "0000");
  const postedTargets = stringArray(payload.posted_targets);

  const postizPostIds = (Array.isArray(payload.postiz_response) ? payload.postiz_response : [])
    .map((entry) => asRecord(entry).postId)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const captionPreview =
    captions[postedTargets[0] ?? ""] ?? Object.values(captions).find((text) => text.trim());

  return {
    id: `${brandId}-${slotDir}-${path.basename(reportPath)}`,
    brandId,
    date,
    time: `${slot.slice(0, 2)}:${slot.slice(2)}`,
    slot,
    slotDir,
    contentType: typeof payload.content_type === "string" ? payload.content_type : "ai_slideshow",
    postedTargets,
    failedTargets: stringArray(payload.failed_targets),
    ok: Boolean(payload.ok),
    captionPreview,
    captions,
    postizPostIds,
    reportFile: path.basename(reportPath),
    reportPath: toRelativeWorkspacePath(reportPath),
  };
}

/**
 * Reads every publish-result-*.json under the drafts tree, newest first.
 */
export async function listPublishHistory(): Promise<PublishEntry[]> {
  const { draftsRoot } = getPaths();
  const reportFiles = await listFilesRecursive(draftsRoot, /^publish-result-.*\.json$/);

  const entries = await Promise.all(
    reportFiles.map(async (reportPath) => {
      const payload = await readJsonFile<Record<string, unknown>>(reportPath, {});
      if (!Object.keys(payload).length) {
        return null;
      }

      const captions = await readJsonFile<Record<string, string>>(
        path.join(path.dirname(reportPath), "captions.json"),
        {},
      );
      return parsePublishReport(reportPath, payload, asRecord(captions) as Record<string, string>);
    }),
  );

  return entries
    .filter((entry): entry is PublishEntry => Boolean(entry))
    .sort((a, b) => slotTimestamp(b.date, b.slot) - slotTimestamp(a.date, a.slot));
}

/**
 * Loads the raw publish-result JSON for one report file, or null when missing.
 */
export async function getPublishReport(brandId: string, slotDir: string, fileName: string) {
  if (!/^publish-result-[a-zA-Z0-9._-]+\.json$/.test(fileName)) {
    return null;
  }

  const reportPath = path.join(getPaths().draftsRoot, brandId, slotDir, fileName);
  if (!(await pathExists(reportPath))) {
    return null;
  }

  return readJsonFile<Record<string, unknown>>(reportPath, {});
}

export { filterPublishHistory, parsePublishFilters, publishHistoryToCsv } from "@/lib/publish-filters";
