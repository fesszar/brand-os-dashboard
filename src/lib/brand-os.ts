import { promises as fs } from "node:fs";
import path from "node:path";

import { addDays, format, isAfter, parseISO } from "date-fns";

import type {
  ActivityEntry,
  BrandCard,
  BrandStatus,
  DraftEntry,
  ExperimentEntry,
  HealthSummary,
  ScriptEntry,
  UploadEntry,
} from "@/lib/types";
import { totals } from "@/lib/analytics-math";
import { listPublishHistory } from "@/lib/publishing";
import {
  getPaths,
  invalidateCache,
  listDirectories,
  listFiles,
  listFilesRecursive,
  parseSlotDir,
  pathExists,
  readJsonFile,
  readJsonLines,
  sortByTimestampDesc,
  toRelativeWorkspacePath,
  withCache,
  writeJsonWithBackup,
  writeTextWithBackup,
} from "@/lib/workspace";

export { invalidateCache, listPublishHistory };

const ACTIVE_BRANDS = new Set([
  "invoicerate",
  "gideonawolesi",
  "fessburn",
  "relaystack",
]);
const DECOMMISSIONED_BRANDS = new Set(["rottenswamp"]);

/**
 * Resolves brand status: an explicit storybook `lifecycle.status` wins over the
 * built-in defaults for known brands.
 */
export function inferBrandStatus(
  brandId: string,
  storybook?: Record<string, unknown> | null,
): BrandStatus {
  const lifecycle = storybook?.lifecycle;
  const explicit =
    lifecycle && typeof lifecycle === "object"
      ? (lifecycle as Record<string, unknown>).status
      : undefined;
  if (explicit === "active" || explicit === "inactive" || explicit === "decommissioned") {
    return explicit;
  }

  if (ACTIVE_BRANDS.has(brandId)) {
    return "active";
  }

  if (DECOMMISSIONED_BRANDS.has(brandId)) {
    return "decommissioned";
  }

  return "inactive";
}

export async function getBrandIds(): Promise<string[]> {
  const { brandsRoot } = getPaths();

  return withCache("brandIds", async () => {
    const ids = await listDirectories(brandsRoot);
    return ids.filter((id) => id !== "_shared");
  });
}

export async function getStorybook(brandId: string) {
  const { brandsRoot } = getPaths();
  const storybookPath = path.join(brandsRoot, brandId, "storybook.json");
  return readJsonFile<Record<string, unknown> | null>(storybookPath, null);
}

export async function updateStorybook(brandId: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("storybook must be a JSON object");
  }

  const { brandsRoot } = getPaths();
  const storybookPath = path.join(brandsRoot, brandId, "storybook.json");
  await writeJsonWithBackup(storybookPath, value);
  invalidateCache("brands");
  invalidateCache("brandDetail");
}

export async function getHookRotation(brandId: string) {
  const { brandsRoot } = getPaths();
  const hookPath = path.join(brandsRoot, brandId, "hook-rotation.json");
  return readJsonFile<Record<string, unknown>>(hookPath, {
    cooldown_posts: 3,
    recent_used: [],
    angles: [],
  });
}

export async function updateHookRotation(brandId: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("hook rotation must be a JSON object");
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.angles)) {
    throw new Error("hook rotation requires an angles array");
  }

  const { brandsRoot } = getPaths();
  const hookPath = path.join(brandsRoot, brandId, "hook-rotation.json");
  await writeJsonWithBackup(hookPath, payload);
  invalidateCache(`brandDetail:${brandId}`);
}

export async function addHookAngle(
  brandId: string,
  angle: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const hookRotation = await getHookRotation(brandId);
  const angles = Array.isArray(hookRotation.angles)
    ? [...(hookRotation.angles as Record<string, unknown>[])]
    : [];

  angles.push(angle);

  const updated = {
    ...hookRotation,
    angles,
  };

  await updateHookRotation(brandId, updated);
  return updated;
}

export async function getScreenshots(brandId: string) {
  const { brandsRoot } = getPaths();
  const screenshotsDir = path.join(brandsRoot, brandId, "context", "screenshots");
  const imageContextPath = path.join(
    brandsRoot,
    brandId,
    "context",
    "image_context.json",
  );

  const [files, imageContext] = await Promise.all([
    listFiles(screenshotsDir),
    readJsonFile<Record<string, unknown> | null>(imageContextPath, null),
  ]);

  return {
    files: files.map((name) => ({
      name,
      path: path.join(screenshotsDir, name),
      relativePath: toRelativeWorkspacePath(path.join(screenshotsDir, name)),
    })),
    imageContext,
  };
}

export async function saveScreenshot(
  brandId: string,
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const { brandsRoot } = getPaths();
  const screenshotsDir = path.join(brandsRoot, brandId, "context", "screenshots");
  await fs.mkdir(screenshotsDir, { recursive: true });

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const targetPath = path.join(screenshotsDir, safeName);
  await fs.writeFile(targetPath, buffer);

  invalidateCache(`brandDetail:${brandId}`);
  return targetPath;
}

function extractDraftPreviewText(texts: unknown): string | undefined {
  if (!Array.isArray(texts) || texts.length === 0) {
    return undefined;
  }

  const first = texts[0];
  if (typeof first === "string") {
    return first;
  }

  if (first && typeof first === "object") {
    const candidate = (first as Record<string, unknown>).text;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return undefined;
}

export async function listDrafts(options?: {
  brandId?: string;
  date?: string;
}): Promise<DraftEntry[]> {
  const { draftsRoot } = getPaths();
  const brands = options?.brandId ? [options.brandId] : await listDirectories(draftsRoot);

  const allDrafts: DraftEntry[] = [];

  for (const brandId of brands) {
    const brandDraftRoot = path.join(draftsRoot, brandId);
    const slotDirs = await listDirectories(brandDraftRoot);

    for (const slotDir of slotDirs) {
      const { date, slot } = parseSlotDir(slotDir);
      if (options?.date && options.date !== date) {
        continue;
      }

      const draftPath = path.join(brandDraftRoot, slotDir);
      const [meta, captions, texts, files] = await Promise.all([
        readJsonFile<Record<string, unknown>>(path.join(draftPath, "meta.json"), {}),
        readJsonFile<Record<string, string>>(path.join(draftPath, "captions.json"), {}),
        readJsonFile<unknown>(path.join(draftPath, "texts.json"), []),
        listFiles(draftPath),
      ]);

      const publishReports = files.filter((name) => name.startsWith("publish-result-"));
      const reportName = publishReports.length
        ? publishReports[publishReports.length - 1]
        : undefined;

      const publish =
        meta.publish && typeof meta.publish === "object"
          ? (meta.publish as Record<string, unknown>)
          : null;
      const targets = Array.isArray(meta.targets)
        ? (meta.targets as string[])
        : Array.isArray(publish?.posted_targets)
          ? (publish.posted_targets as string[])
          : [];

      allDrafts.push({
        brandId,
        slotDir,
        date,
        slot,
        status:
          (typeof publish?.status === "string" && publish.status) ||
          (reportName ? "published" : "scheduled"),
        createdAt: typeof meta.created_at === "string" ? meta.created_at : null,
        angle: typeof meta.angle === "string" ? meta.angle : undefined,
        angleName: typeof meta.angle_name === "string" ? meta.angle_name : undefined,
        contentType:
          typeof meta.content_type === "string" ? meta.content_type : "ai_slideshow",
        targets,
        publishReport: reportName ? path.join(draftPath, reportName) : undefined,
        hasVideo: files.includes("video.mp4") || files.includes("video.mov"),
        captions,
        textPreview: extractDraftPreviewText(texts),
      });
    }
  }

  return allDrafts.sort((a, b) => {
    const aTs = Date.parse(`${a.date}T${a.slot.slice(0, 2)}:${a.slot.slice(2)}:00`) || 0;
    const bTs = Date.parse(`${b.date}T${b.slot.slice(0, 2)}:${b.slot.slice(2)}:00`) || 0;
    return bTs - aTs;
  });
}

export async function getDraft(brandId: string, slotDir: string) {
  const { draftsRoot } = getPaths();
  const draftPath = path.join(draftsRoot, brandId, slotDir);
  const [meta, captions, prompts, texts, files] = await Promise.all([
    readJsonFile<Record<string, unknown>>(path.join(draftPath, "meta.json"), {}),
    readJsonFile<Record<string, string>>(path.join(draftPath, "captions.json"), {}),
    readJsonFile<unknown[]>(path.join(draftPath, "prompts.json"), []),
    readJsonFile<unknown[]>(path.join(draftPath, "texts.json"), []),
    listFilesRecursive(draftPath),
  ]);

  const slideFiles = files.filter((filePath) => /slides\/slide\d+\.(png|jpg|jpeg)$/i.test(filePath));

  return {
    brandId,
    slotDir,
    meta,
    captions,
    prompts,
    texts,
    slides: slideFiles.map((filePath) => toRelativeWorkspacePath(filePath)),
    files: files.map((filePath) => toRelativeWorkspacePath(filePath)),
  };
}

/**
 * Updates mutable draft files for a single slot directory.
 */
export async function updateDraft(
  brandId: string,
  slotDir: string,
  payload: {
    meta?: Record<string, unknown>;
    captions?: Record<string, string>;
    texts?: unknown[];
  },
) {
  const { draftsRoot } = getPaths();
  const draftPath = path.join(draftsRoot, brandId, slotDir);

  if (!(await pathExists(draftPath))) {
    throw new Error(`Draft '${brandId}/${slotDir}' does not exist`);
  }

  if (payload.meta !== undefined) {
    await writeJsonWithBackup(path.join(draftPath, "meta.json"), payload.meta);
  }

  if (payload.captions !== undefined) {
    await writeJsonWithBackup(path.join(draftPath, "captions.json"), payload.captions);
  }

  if (payload.texts !== undefined) {
    await writeJsonWithBackup(path.join(draftPath, "texts.json"), payload.texts);
  }

  invalidateCache("brands");
  invalidateCache(`brandDetail:${brandId}`);
  return getDraft(brandId, slotDir);
}

/**
 * Deletes an entire draft slot directory and all generated files.
 */
export async function deleteDraft(brandId: string, slotDir: string) {
  const { draftsRoot } = getPaths();
  const draftPath = path.join(draftsRoot, brandId, slotDir);

  if (!(await pathExists(draftPath))) {
    throw new Error(`Draft '${brandId}/${slotDir}' does not exist`);
  }

  await fs.rm(draftPath, { recursive: true, force: false });

  invalidateCache("brands");
  invalidateCache(`brandDetail:${brandId}`);

  return {
    ok: true,
    brandId,
    slotDir,
  };
}

export async function getTodayTimeline() {
  const today = format(new Date(), "yyyy-MM-dd");
  const drafts = await listDrafts({ date: today });

  return drafts
    .map((draft) => ({
      id: `${draft.brandId}-${draft.slotDir}`,
      brandId: draft.brandId,
      slot: `${draft.slot.slice(0, 2)}:${draft.slot.slice(2)}`,
      status: draft.status,
      targets: draft.targets,
      contentType: draft.contentType || "ai_slideshow",
      preview: draft.textPreview || draft.captions?.tiktok || "No preview available",
      slotDir: draft.slotDir,
    }))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const [todayTimeline, drafts, uploads] = await Promise.all([
    getTodayTimeline(),
    listDrafts(),
    listUploads(),
  ]);

  const now = new Date();
  const nextPost = todayTimeline
    .map((item) => {
      const dt = new Date(`${format(new Date(), "yyyy-MM-dd")}T${item.slot}:00`);
      return { ...item, dt };
    })
    .filter((item) => isAfter(item.dt, now))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime())[0];

  const publishedToday = todayTimeline.filter((item) => item.status === "published").length;
  const failedToday = todayTimeline.filter((item) => item.status.includes("fail")).length;
  const skippedToday = drafts.filter((draft) => draft.status.includes("skip")).length;

  return {
    scheduledToday: todayTimeline.length,
    publishedToday,
    failedToday,
    skippedToday,
    uploadQueue: uploads.filter((upload) => upload.status === "pending").length,
    nextPostAt: nextPost ? nextPost.dt.toISOString() : null,
  };
}

export async function getActivityFeed(limit = 100): Promise<ActivityEntry[]> {
  const [publishHistory, scripts, uploads, experiments] = await Promise.all([
    listPublishHistory(),
    listScripts(),
    listUploads(),
    listExperiments(),
  ]);

  const entries: ActivityEntry[] = [];

  for (const publish of publishHistory) {
    entries.push({
      id: publish.id,
      type: "post_published",
      brandId: publish.brandId,
      status: publish.ok ? "ok" : "failed",
      timestamp: `${publish.date}T${publish.time}:00.000Z`,
      message: publish.ok
        ? `${publish.brandId} published to ${publish.postedTargets.join(", ") || "unknown"}`
        : `${publish.brandId} publish failed`,
      detail: publish.reportPath,
    });
  }

  for (const script of scripts) {
    entries.push({
      id: `script-${script.brandId}-${script.slotDir}`,
      type: "video_script_sent",
      brandId: script.brandId,
      status: script.status === "pending" ? "info" : "ok",
      timestamp: `${script.date}T${script.slot.slice(0, 2)}:${script.slot.slice(2)}:00.000Z`,
      message: `Script ${script.shortCode} (${script.angleName || script.angleId || "angle"})`,
      detail: script.hook,
    });
  }

  for (const upload of uploads) {
    entries.push({
      id: `upload-${upload.brandId}-${upload.filename}`,
      type: "video_uploaded",
      brandId: upload.brandId,
      status: upload.status === "pending" ? "info" : "ok",
      timestamp: upload.uploadedAt,
      message: `${upload.filename} uploaded (${upload.status})`,
      detail: upload.path,
    });
  }

  for (const experiment of experiments) {
    const source = typeof experiment.source === "string" ? experiment.source : "analytics";
    const type = source.includes("warmup")
      ? "warmup_completed"
      : source.includes("analytics")
        ? "analytics_ingested"
        : source.includes("cron")
          ? "cron_fired"
          : "analytics_ingested";

    const brandId =
      typeof experiment.brand_id === "string" ? experiment.brand_id : "unknown_brand";
    const timestamp =
      typeof experiment.logged_at === "string"
        ? experiment.logged_at
        : new Date().toISOString();

    entries.push({
      id: `exp-${brandId}-${timestamp}-${source}`,
      type,
      brandId,
      status: "info",
      timestamp,
      message: `${source} event for ${brandId}`,
      detail:
        typeof experiment.hypothesis === "string" ? experiment.hypothesis : undefined,
      platform:
        typeof experiment.channel_id === "string" ? experiment.channel_id : undefined,
    });
  }

  return sortByTimestampDesc(entries).slice(0, limit);
}

export async function getBrandList(): Promise<BrandCard[]> {
  return withCache("brands:list", async () => {
    const [brandIds, postizConfig, drafts] = await Promise.all([
      getBrandIds(),
      readJsonFile<Record<string, unknown>>(getPaths().postizConfigPath, {}),
      listDrafts(),
    ]);

    const posting =
      postizConfig.posting && typeof postizConfig.posting === "object"
        ? (postizConfig.posting as Record<string, unknown>)
        : {};

    const thisWeekStart = addDays(new Date(), -7);

    const brandCards: BrandCard[] = [];

    for (const brandId of brandIds) {
      const storybook = await getStorybook(brandId);
      const brandInfo =
        storybook?.brand && typeof storybook.brand === "object"
          ? (storybook.brand as Record<string, unknown>)
          : {};

      const brandDrafts = drafts.filter((draft) => draft.brandId === brandId);
      const postsThisWeek = brandDrafts.filter((draft) => {
        const parsed = parseISO(`${draft.date}T00:00:00.000Z`);
        return isAfter(parsed, thisWeekStart);
      }).length;

      const engagementRate = totals(await getExperimentsForBrand(brandId)).engagementRate;

      const scheduleConfig =
        posting[brandId] && typeof posting[brandId] === "object"
          ? (posting[brandId] as Record<string, unknown>)
          : null;
      const firstSlot = Array.isArray(scheduleConfig?.schedule)
        ? String(scheduleConfig.schedule[0])
        : null;

      brandCards.push({
        id: brandId,
        name:
          (typeof brandInfo.name === "string" && brandInfo.name) ||
          brandId.replace(/(^.|_.)/g, (token) => token.replace("_", " ").toUpperCase()),
        status: inferBrandStatus(brandId, storybook),
        category:
          typeof brandInfo.category === "string" ? brandInfo.category : undefined,
        postsThisWeek,
        engagementRate,
        nextScheduledPost: firstSlot,
        tagline:
          typeof (brandInfo as Record<string, unknown>).tagline === "string"
            ? ((brandInfo as Record<string, unknown>).tagline as string)
            : undefined,
      });
    }

    return brandCards;
  });
}

export async function getExperimentsForBrand(brandId: string): Promise<ExperimentEntry[]> {
  const { brandsRoot } = getPaths();
  const experimentsPath = path.join(brandsRoot, brandId, "experiments.jsonl");
  return readJsonLines<ExperimentEntry>(experimentsPath);
}

export async function listExperiments(): Promise<ExperimentEntry[]> {
  const brandIds = await getBrandIds();
  const experiments = await Promise.all(
    brandIds.map(async (brandId) => {
      const rows = await getExperimentsForBrand(brandId);
      return rows.slice(-400);
    }),
  );

  return experiments
    .flat()
    .sort((a, b) => {
      const aTs = Date.parse(a.logged_at ?? "") || 0;
      const bTs = Date.parse(b.logged_at ?? "") || 0;
      return bTs - aTs;
    });
}

export async function getBrandDetail(brandId: string) {
  const cacheKey = `brandDetail:${brandId}`;

  return withCache(cacheKey, async () => {
    const [storybook, hookRotation, screenshots, drafts, experiments, config] =
      await Promise.all([
        getStorybook(brandId),
        getHookRotation(brandId),
        getScreenshots(brandId),
        listDrafts({ brandId }),
        getExperimentsForBrand(brandId),
        readJsonFile<Record<string, unknown>>(getPaths().postizConfigPath, {}),
      ]);

    const postiz =
      config.postiz && typeof config.postiz === "object"
        ? (config.postiz as Record<string, unknown>)
        : {};
    const posting =
      config.posting && typeof config.posting === "object"
        ? (config.posting as Record<string, unknown>)
        : {};

    return {
      brandId,
      storybook,
      hookRotation,
      screenshots,
      drafts,
      experiments: experiments.slice(-200),
      integrations:
        postiz[brandId] && typeof postiz[brandId] === "object"
          ? (postiz[brandId] as Record<string, string>)
          : {},
      platformSettings:
        posting[brandId] && typeof posting[brandId] === "object"
          ? (posting[brandId] as Record<string, unknown>)
          : {},
    };
  });
}

export async function listScripts(brandId?: string): Promise<ScriptEntry[]> {
  const { scriptsRoot, draftsRoot } = getPaths();
  const brands = brandId ? [brandId] : await listDirectories(scriptsRoot);

  const scripts: ScriptEntry[] = [];

  for (const id of brands) {
    const brandRoot = path.join(scriptsRoot, id);
    const slotDirs = await listDirectories(brandRoot);

    for (const slotDir of slotDirs) {
      const filePath = path.join(brandRoot, slotDir, "script.json");
      const script = await readJsonFile<Record<string, unknown>>(filePath, {});
      if (!Object.keys(script).length) {
        continue;
      }

      const draftPath = path.join(draftsRoot, id, slotDir);
      const draftFiles = await listFiles(draftPath);
      const hasVideo = draftFiles.includes("video.mp4") || draftFiles.includes("video.mov");
      const publishReport = draftFiles.some((name) => name.startsWith("publish-result-"));

      scripts.push({
        brandId: id,
        slotDir,
        shortCode:
          typeof script.short_code === "string" ? script.short_code : `${id}-${slotDir}`,
        angleId: typeof script.angle_id === "string" ? script.angle_id : undefined,
        angleName: typeof script.angle_name === "string" ? script.angle_name : undefined,
        hook: typeof script.hook === "string" ? script.hook : undefined,
        slot: typeof script.slot === "string" ? script.slot : parseSlotDir(slotDir).slot,
        date: typeof script.date === "string" ? script.date : parseSlotDir(slotDir).date,
        status: publishReport ? "published" : hasVideo ? "recorded" : "pending",
        hasMatchedVideo: hasVideo,
      });
    }
  }

  return scripts.sort((a, b) => {
    const aTs = Date.parse(`${a.date}T${a.slot.slice(0, 2)}:${a.slot.slice(2)}:00`) || 0;
    const bTs = Date.parse(`${b.date}T${b.slot.slice(0, 2)}:${b.slot.slice(2)}:00`) || 0;
    return bTs - aTs;
  });
}

export async function getScript(brandId: string, slotDir: string) {
  const { scriptsRoot } = getPaths();
  const scriptPath = path.join(scriptsRoot, brandId, slotDir, "script.json");
  const markdownPath = path.join(scriptsRoot, brandId, slotDir, "script.md");

  const [json, markdown] = await Promise.all([
    readJsonFile<Record<string, unknown>>(scriptPath, {}),
    fs.readFile(markdownPath, "utf8").catch(() => ""),
  ]);

  return {
    brandId,
    slotDir,
    json,
    markdown,
  };
}

/**
 * Updates script.json and/or script.md for an existing script slot.
 */
export async function updateScript(
  brandId: string,
  slotDir: string,
  payload: {
    json?: Record<string, unknown>;
    markdown?: string;
  },
) {
  const { scriptsRoot } = getPaths();
  const scriptRoot = path.join(scriptsRoot, brandId, slotDir);

  if (!(await pathExists(scriptRoot))) {
    throw new Error(`Script '${brandId}/${slotDir}' does not exist`);
  }

  if (payload.json !== undefined) {
    await writeJsonWithBackup(path.join(scriptRoot, "script.json"), payload.json);
  }

  if (payload.markdown !== undefined) {
    await writeTextWithBackup(path.join(scriptRoot, "script.md"), payload.markdown);
  }

  invalidateCache(`brandDetail:${brandId}`);
  return getScript(brandId, slotDir);
}

/**
 * Deletes an entire script slot directory.
 */
export async function deleteScript(brandId: string, slotDir: string) {
  const { scriptsRoot } = getPaths();
  const scriptRoot = path.join(scriptsRoot, brandId, slotDir);

  if (!(await pathExists(scriptRoot))) {
    throw new Error(`Script '${brandId}/${slotDir}' does not exist`);
  }

  await fs.rm(scriptRoot, { recursive: true, force: false });
  invalidateCache(`brandDetail:${brandId}`);

  return {
    ok: true,
    brandId,
    slotDir,
  };
}

export async function listUploads(brandId?: string): Promise<UploadEntry[]> {
  const { uploadsRoot } = getPaths();
  const brands = brandId ? [brandId] : await listDirectories(uploadsRoot);

  const uploads: UploadEntry[] = [];

  for (const id of brands) {
    const base = path.join(uploadsRoot, id);
    const [pending, posted, published] = await Promise.all([
      listFiles(base),
      listFiles(path.join(base, "posted")),
      listFiles(path.join(base, "published")),
    ]);

    for (const fileName of pending) {
      if (["posted", "published"].includes(fileName)) {
        continue;
      }

      const absolutePath = path.join(base, fileName);
      try {
        const stats = await fs.stat(absolutePath);
        uploads.push({
          brandId: id,
          filename: fileName,
          path: toRelativeWorkspacePath(absolutePath),
          status: "pending",
          uploadedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
        });
      } catch {
        // ignore removed files
      }
    }

    for (const fileName of posted) {
      const absolutePath = path.join(base, "posted", fileName);
      try {
        const stats = await fs.stat(absolutePath);
        uploads.push({
          brandId: id,
          filename: fileName,
          path: toRelativeWorkspacePath(absolutePath),
          status: "posted",
          uploadedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
        });
      } catch {
        // ignore removed files
      }
    }

    for (const fileName of published) {
      const absolutePath = path.join(base, "published", fileName);
      try {
        const stats = await fs.stat(absolutePath);
        uploads.push({
          brandId: id,
          filename: fileName,
          path: toRelativeWorkspacePath(absolutePath),
          status: "published",
          uploadedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
        });
      } catch {
        // ignore removed files
      }
    }
  }

  return uploads.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
}

export async function saveUpload(
  brandId: string,
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const { uploadsRoot } = getPaths();
  const brandRoot = path.join(uploadsRoot, brandId);
  await fs.mkdir(brandRoot, { recursive: true });

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const targetPath = path.join(brandRoot, safeName);
  await fs.writeFile(targetPath, buffer);

  invalidateCache("uploads");
  return targetPath;
}

async function resolveUploadPath(brandId: string, filename: string) {
  const { uploadsRoot } = getPaths();
  const base = path.join(uploadsRoot, brandId);

  const candidates = [
    { status: "pending" as const, path: path.join(base, filename) },
    { status: "posted" as const, path: path.join(base, "posted", filename) },
    { status: "published" as const, path: path.join(base, "published", filename) },
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate.path)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Moves an upload file between pending/posted/published folders.
 */
export async function updateUploadStatus(
  brandId: string,
  filename: string,
  status: UploadEntry["status"],
) {
  const current = await resolveUploadPath(brandId, filename);
  if (!current) {
    throw new Error(`Upload '${brandId}/${filename}' does not exist`);
  }

  if (current.status === status) {
    return {
      ok: true,
      brandId,
      filename,
      status,
    };
  }

  const { uploadsRoot } = getPaths();
  const base = path.join(uploadsRoot, brandId);
  const targetDir =
    status === "pending"
      ? base
      : status === "posted"
        ? path.join(base, "posted")
        : path.join(base, "published");

  await fs.mkdir(targetDir, { recursive: true });
  await fs.rename(current.path, path.join(targetDir, filename));

  invalidateCache("uploads");
  return {
    ok: true,
    brandId,
    filename,
    status,
  };
}

/**
 * Deletes an upload file regardless of its current status folder.
 */
export async function deleteUpload(brandId: string, filename: string) {
  const current = await resolveUploadPath(brandId, filename);
  if (!current) {
    throw new Error(`Upload '${brandId}/${filename}' does not exist`);
  }

  await fs.rm(current.path, { force: false });
  invalidateCache("uploads");

  return {
    ok: true,
    brandId,
    filename,
  };
}

export async function getCalendarItems() {
  const [drafts, scripts] = await Promise.all([listDrafts(), listScripts()]);

  const draftItems = drafts.map((draft) => ({
    id: `draft-${draft.brandId}-${draft.slotDir}`,
    kind: "draft",
    brandId: draft.brandId,
    date: draft.date,
    slot: draft.slot,
    status: draft.status,
    title: draft.angleName || draft.angle || "Draft",
  }));

  const scriptItems = scripts.map((script) => ({
    id: `script-${script.brandId}-${script.slotDir}`,
    kind: "script",
    brandId: script.brandId,
    date: script.date,
    slot: script.slot,
    status: script.status,
    title: script.angleName || script.angleId || script.shortCode,
  }));

  return [...draftItems, ...scriptItems].sort((a, b) => {
    const aTs = Date.parse(`${a.date}T${a.slot.slice(0, 2)}:${a.slot.slice(2)}:00`) || 0;
    const bTs = Date.parse(`${b.date}T${b.slot.slice(0, 2)}:${b.slot.slice(2)}:00`) || 0;
    return aTs - bTs;
  });
}

export async function triggerDraftGeneration(brandId: string, slot: string) {
  const now = new Date().toISOString();
  return {
    ok: true,
    action: "generate",
    brandId,
    slot,
    triggeredAt: now,
    note: "Generation trigger endpoint is wired. Integrate with Brand OS generate CLI when command contract is finalized.",
  };
}

export async function triggerDraftPublish(brandId: string, slotDir: string) {
  const now = new Date().toISOString();
  return {
    ok: true,
    action: "publish",
    brandId,
    slotDir,
    triggeredAt: now,
    note: "Publish trigger endpoint is wired. Integrate with Brand OS publish CLI when command contract is finalized.",
  };
}
