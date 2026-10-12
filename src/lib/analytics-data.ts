import path from "node:path";

import { computeBrandPerformance, computeCrossBrand, computeFunnel } from "@/lib/analytics";
import { getBrandIds, getExperimentsForBrand, getStorybook, listExperiments } from "@/lib/brand-os";
import { buildDefinitionRow, buildExperiments, type ExperimentStatus } from "@/lib/experiments";
import { appendJsonLine, getPaths, invalidateCache } from "@/lib/workspace";

export const FUNNEL_BRAND_ID = "gideonawolesi";

export async function getCrossBrandAnalytics() {
  const [brandIds, experiments] = await Promise.all([getBrandIds(), listExperiments()]);
  return computeCrossBrand(brandIds, experiments);
}

export async function getBrandPerformance(brandId: string) {
  return computeBrandPerformance(brandId, await getExperimentsForBrand(brandId));
}

export async function getFunnelAnalytics(brandId = FUNNEL_BRAND_ID) {
  const [storybook, experiments] = await Promise.all([getStorybook(brandId), getExperimentsForBrand(brandId)]);
  return computeFunnel(brandId, storybook, experiments);
}

/**
 * Reads the full experiments.jsonl of every brand and builds experiment state.
 */
export async function listAllExperiments() {
  const brandIds = await getBrandIds();
  const perBrand = await Promise.all(
    brandIds.map(async (brandId) =>
      buildExperiments((await getExperimentsForBrand(brandId)).map((row) => ({ brand_id: brandId, ...row }))),
    ),
  );
  return perBrand.flat().sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
}

function experimentsPath(brandId: string) {
  return path.join(getPaths().brandsRoot, brandId, "experiments.jsonl");
}

async function assertBrand(brandId: unknown): Promise<string> {
  if (typeof brandId !== "string" || !(await getBrandIds()).includes(brandId)) {
    throw new Error(`unknown brand '${String(brandId)}'`);
  }
  return brandId;
}

/**
 * Appends a new experiment definition row to the brand's experiments.jsonl.
 */
export async function createExperiment(input: { brandId?: unknown; hypothesis?: unknown; metric?: unknown; variants?: unknown }) {
  const brandId = await assertBrand(input.brandId);
  const existing = buildExperiments(await getExperimentsForBrand(brandId)).map((e) => e.id);
  const row = buildDefinitionRow({ ...input, brandId }, existing);
  await appendJsonLine(experimentsPath(brandId), row);
  invalidateCache();
  return row;
}

/**
 * Archives or re-activates an experiment by appending a status row.
 */
export async function setExperimentStatus(brandIdInput: unknown, experimentId: string, status: ExperimentStatus) {
  const brandId = await assertBrand(brandIdInput);
  const known = buildExperiments(await getExperimentsForBrand(brandId)).some((e) => e.id === experimentId);
  if (!known) {
    throw new Error(`experiment '${experimentId}' not found for ${brandId}`);
  }
  const row = {
    logged_at: new Date().toISOString(),
    brand_id: brandId,
    source: "dashboard",
    type: "experiment_status",
    experiment_id: experimentId,
    status,
  };
  await appendJsonLine(experimentsPath(brandId), row);
  invalidateCache();
  return row;
}
