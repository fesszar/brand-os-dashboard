import { promises as fs } from "node:fs";
import path from "node:path";

import { getStorybook, updateStorybook } from "@/lib/brand-os";
import { listCrons, toggleCron } from "@/lib/crons";
import { PLATFORM_SCHEMAS } from "@/lib/platform-settings-schema";
import { getPaths, invalidateCache, pathExists, writeJsonWithBackup } from "@/lib/workspace";

const BRAND_ID_PATTERN = /^[a-z0-9_]{2,40}$/;

/**
 * Throws unless the id is lowercase letters, digits or underscores (2–40 chars).
 */
export function assertNewBrandId(brandId: unknown): string {
  if (typeof brandId !== "string" || !BRAND_ID_PATTERN.test(brandId)) {
    throw new Error("brand id must be 2-40 lowercase letters, digits or underscores");
  }
  return brandId;
}

function assertName(name: unknown): string {
  if (typeof name !== "string" || !name.trim() || name.length > 80) {
    throw new Error("brand name is required (max 80 characters)");
  }
  return name.trim();
}

function assertPlatforms(platforms: unknown): string[] {
  const known = PLATFORM_SCHEMAS.map((schema) => schema.platform);
  if (!Array.isArray(platforms) || platforms.some((p) => typeof p !== "string" || !known.includes(p))) {
    throw new Error(`platforms must be a subset of ${known.join(", ")}`);
  }
  return [...new Set(platforms as string[])];
}

/**
 * Minimal storybook.json for a new brand, ready for the storybook editor.
 */
export function buildStorybookSkeleton(brandId: string, brandName: string, platforms: string[], now = new Date()) {
  return {
    schema_version: "1.0.0",
    generated_at: now.toISOString(),
    lifecycle: { status: "active", created_at: now.toISOString() },
    brand: {
      id: brandId,
      name: brandName,
      category: "new_brand",
      positioning: { for_who: "", primary_pain: "", promise: "", differentiation: [], proof_points: [] },
    },
    voice: {
      tone_sliders: { confident: 0.6, playful: 0.2, luxurious: 0.1, technical: 0.4, empathetic: 0.5 },
      style_rules: [],
      vocabulary: { preferred: [], banned: [] },
    },
    messaging: { pillars: [], ctas: { primary: [], secondary: [], avoid: [] } },
    channels: Object.fromEntries(platforms.map((platform) => [platform, { enabled: true }])),
  };
}

async function scaffoldBrandDirs(brandId: string) {
  const { brandsRoot, draftsRoot, uploadsRoot, scriptsRoot } = getPaths();
  const brandRoot = path.join(brandsRoot, brandId);
  await fs.mkdir(path.join(brandRoot, "context", "screenshots"), { recursive: true });
  await Promise.all(
    [draftsRoot, uploadsRoot, scriptsRoot].map((root) => fs.mkdir(path.join(root, brandId), { recursive: true })),
  );
  await fs.writeFile(path.join(brandRoot, "experiments.jsonl"), "", { flag: "a" });
  return brandRoot;
}

async function assertBrandAbsent(brandId: string) {
  if (await pathExists(path.join(getPaths().brandsRoot, brandId))) {
    throw new Error(`Brand '${brandId}' already exists`);
  }
}

/**
 * Creates a brand directory tree with a storybook skeleton and empty hooks.
 */
export async function createBrand(input: { brandId?: unknown; name?: unknown; platforms?: unknown }) {
  const brandId = assertNewBrandId(input.brandId);
  const name = assertName(input.name);
  const platforms = assertPlatforms(input.platforms ?? []);
  await assertBrandAbsent(brandId);

  const brandRoot = await scaffoldBrandDirs(brandId);
  await Promise.all([
    writeJsonWithBackup(path.join(brandRoot, "storybook.json"), buildStorybookSkeleton(brandId, name, platforms)),
    writeJsonWithBackup(path.join(brandRoot, "hook-rotation.json"), { cooldown_posts: 3, recent_used: [], angles: [] }),
  ]);

  invalidateCache();
  return { ok: true, brandId };
}

/**
 * Copies storybook + hook rotation into a new brand. Analytics history is
 * not copied so the clone starts with clean experiments.
 */
export async function cloneBrand(input: { sourceBrandId?: unknown; brandId?: unknown; name?: unknown }) {
  const brandId = assertNewBrandId(input.brandId);
  const sourceBrandId = typeof input.sourceBrandId === "string" ? input.sourceBrandId : "";
  const { brandsRoot } = getPaths();
  const sourceRoot = path.join(brandsRoot, sourceBrandId);
  const source = sourceBrandId ? await getStorybook(sourceBrandId) : null;
  if (!source) {
    throw new Error(`Source brand '${sourceBrandId}' does not exist`);
  }
  await assertBrandAbsent(brandId);

  const brandRoot = await scaffoldBrandDirs(brandId);
  const hookSource = path.join(sourceRoot, "hook-rotation.json");
  if (await pathExists(hookSource)) {
    await fs.copyFile(hookSource, path.join(brandRoot, "hook-rotation.json"));
  }

  const sourceBrand = (source.brand && typeof source.brand === "object" ? source.brand : {}) as Record<string, unknown>;
  const name =
    input.name !== undefined && input.name !== ""
      ? assertName(input.name)
      : `${typeof sourceBrand.name === "string" ? sourceBrand.name : sourceBrandId} Clone`;
  const now = new Date().toISOString();

  await writeJsonWithBackup(path.join(brandRoot, "storybook.json"), {
    ...source,
    generated_at: now,
    lifecycle: { status: "active", created_at: now, cloned_from: sourceBrandId },
    brand: { ...sourceBrand, id: brandId, name },
  });

  invalidateCache();
  return { ok: true, sourceBrandId, brandId };
}

/**
 * Marks a brand decommissioned in its storybook and disables its cron jobs.
 */
export async function decommissionBrand(brandId: string) {
  const storybook = await getStorybook(brandId);
  if (!storybook) {
    throw new Error(`Brand '${brandId}' does not exist`);
  }

  await updateStorybook(brandId, {
    ...storybook,
    lifecycle: {
      ...(storybook.lifecycle && typeof storybook.lifecycle === "object" ? storybook.lifecycle : {}),
      status: "decommissioned",
      decommissioned_at: new Date().toISOString(),
    },
  });

  const { jobs } = await listCrons();
  const brandJobs = jobs.filter((job) => job.brandId === brandId && job.enabled);
  const disabled = [];
  for (const job of brandJobs) {
    const result = await toggleCron(job.id, false);
    disabled.push({ id: job.id, name: job.name, source: result.source });
  }

  invalidateCache();
  return { ok: true, brandId, status: "decommissioned" as const, disabledCrons: disabled };
}
