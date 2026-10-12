import path from "node:path";

import {
  mergeSettings,
  schemaDefaults,
  validateSettingsMap,
  type PlatformSettingsMap,
} from "@/lib/platform-settings-schema";
import {
  asRecord,
  getPaths,
  invalidateCache,
  readJsonFile,
  writeJsonState,
  writeJsonWithBackup,
} from "@/lib/workspace";

const DEFAULT_POSTIZ_URL = "https://api.postiz.com";
const POSTIZ_TIMEOUT_MS = 10_000;

export type BrandPlatformSettings = {
  brandId: string;
  overrides: PlatformSettingsMap;
  effective: PlatformSettingsMap;
  integrations: Record<string, string>;
};

export type PostizStatus = {
  ok: boolean;
  checkedAt: string;
  message: string;
  integrationCount?: number;
};

function postizStatusPath() {
  return path.join(path.dirname(getPaths().postizConfigPath), ".dashboard-postiz-status.json");
}

/**
 * Masks an API key so only the last four characters are visible.
 */
export function maskSecret(secret: string) {
  if (!secret) {
    return "";
  }
  return secret.length <= 4 ? "••••" : `${"•".repeat(8)}${secret.slice(-4)}`;
}

function stringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/**
 * Reads global defaults, per-brand overrides and Postiz integration mapping.
 */
export async function getPlatformSettings(brandIds: string[]) {
  const config = await readJsonFile<Record<string, unknown>>(getPaths().postizConfigPath, {});
  const stored = asRecord(config.platform_settings);
  const postiz = asRecord(config.postiz);

  const defaults = mergeSettings(schemaDefaults(), asRecord(stored.defaults) as PlatformSettingsMap);
  const brandOverrides = asRecord(stored.brands);

  const brands: BrandPlatformSettings[] = brandIds.map((brandId) => {
    const overrides = asRecord(brandOverrides[brandId]) as PlatformSettingsMap;
    return {
      brandId,
      overrides,
      effective: mergeSettings(defaults, overrides),
      integrations: stringRecord(postiz[brandId]),
    };
  });

  const apiKey = typeof postiz.apiKey === "string" ? postiz.apiKey : "";
  const lastStatus = await readJsonFile<PostizStatus | null>(postizStatusPath(), null);

  return {
    defaults,
    brands,
    postiz: {
      baseUrl: typeof postiz.baseUrl === "string" ? postiz.baseUrl : DEFAULT_POSTIZ_URL,
      apiKeyMasked: maskSecret(apiKey),
      configured: Boolean(apiKey),
      lastStatus,
    },
  };
}

/**
 * Validates and persists defaults and/or one brand's overrides into config.json.
 */
export async function updatePlatformSettings(payload: {
  defaults?: unknown;
  brandId?: string;
  overrides?: unknown;
}) {
  const configPath = getPaths().postizConfigPath;
  const config = await readJsonFile<Record<string, unknown>>(configPath, {});
  const stored = asRecord(config.platform_settings);
  const next = { defaults: asRecord(stored.defaults), brands: { ...asRecord(stored.brands) } };

  if (payload.defaults !== undefined) {
    const result = validateSettingsMap(payload.defaults);
    if (!result.ok) {
      throw new Error(`defaults: ${result.error}`);
    }
    next.defaults = result.value;
  }

  if (payload.brandId) {
    const result = validateSettingsMap(payload.overrides ?? {});
    if (!result.ok) {
      throw new Error(`${payload.brandId}: ${result.error}`);
    }
    next.brands[payload.brandId] = result.value;
  }

  await writeJsonWithBackup(configPath, { ...config, platform_settings: next });
  invalidateCache("brands");
  invalidateCache("brandDetail");
}

/**
 * Calls the Postiz integrations endpoint to verify the API key works and
 * records the outcome as the last sync status.
 */
export async function testPostizConnection(): Promise<PostizStatus> {
  const config = await readJsonFile<Record<string, unknown>>(getPaths().postizConfigPath, {});
  const postiz = asRecord(config.postiz);
  const apiKey = typeof postiz.apiKey === "string" ? postiz.apiKey : "";
  const baseUrl = (typeof postiz.baseUrl === "string" ? postiz.baseUrl : DEFAULT_POSTIZ_URL).replace(/\/$/, "");

  let status: PostizStatus;
  if (!apiKey) {
    status = { ok: false, checkedAt: new Date().toISOString(), message: "No Postiz API key configured" };
  } else {
    try {
      const response = await fetch(`${baseUrl}/public/v1/integrations`, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(POSTIZ_TIMEOUT_MS),
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as unknown;
      status = response.ok
        ? {
            ok: true,
            checkedAt: new Date().toISOString(),
            message: "Connected",
            integrationCount: Array.isArray(body) ? body.length : undefined,
          }
        : {
            ok: false,
            checkedAt: new Date().toISOString(),
            message: `Postiz responded ${response.status}`,
          };
    } catch (error) {
      status = {
        ok: false,
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Postiz request failed",
      };
    }
  }

  await writeJsonState(postizStatusPath(), status);
  return status;
}
