import { asRecord, getPaths, invalidateCache, readJsonFile, writeJsonWithBackup } from "@/lib/workspace";

export const NOTIFICATION_CHANNELS = ["telegram", "none"] as const;
export const NOTIFICATION_EVENTS = [
  { key: "post_published", label: "Post published" },
  { key: "publish_failed", label: "Publish failed" },
  { key: "draft_generated", label: "Draft generated" },
  { key: "video_uploaded", label: "Video uploaded" },
  { key: "cron_failed", label: "Cron job failed" },
  { key: "warmup_completed", label: "Warmup completed" },
  { key: "weekly_report", label: "Weekly lead report" },
] as const;

const DEFAULT_EVENTS = ["publish_failed", "cron_failed", "weekly_report"];

export type GlobalSettings = {
  workspace: string;
  timezone: string;
  defaultGenerationModel: string;
  defaultPublishingModel: string;
  notificationChannel: string;
  notificationEvents: string[];
  postizConfigured: boolean;
};

/**
 * Reads the editable global settings. Never returns raw config objects, so
 * secrets such as the Postiz API key cannot reach the client.
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  const { postizConfigPath, globalConfigPath, workspace } = getPaths();
  const [brandConfig, globalConfig] = await Promise.all([
    readJsonFile<Record<string, unknown>>(postizConfigPath, {}),
    readJsonFile<Record<string, unknown>>(globalConfigPath, {}),
  ]);
  const personal = asRecord(asRecord(brandConfig.posting).personal);
  const imageGen = asRecord(brandConfig.imageGen);
  const events = globalConfig.notification_events;

  return {
    workspace,
    timezone: typeof personal.timezone === "string" ? personal.timezone : "Europe/Warsaw",
    defaultGenerationModel: typeof imageGen.model === "string" ? imageGen.model : "gemini-2.5-flash-image",
    defaultPublishingModel: typeof globalConfig.publishModel === "string" ? globalConfig.publishModel : "flash",
    notificationChannel: typeof globalConfig.notifications === "string" ? globalConfig.notifications : "telegram",
    notificationEvents: Array.isArray(events) ? events.filter((e): e is string => typeof e === "string") : DEFAULT_EVENTS,
    postizConfigured: Boolean(asRecord(brandConfig.postiz).apiKey),
  };
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function modelName(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[\w.:/-]{1,100}$/.test(value.trim())) {
    throw new Error(`${label} must be a model id (letters, digits, . : / - _)`);
  }
  return value.trim();
}

/**
 * Validates a partial settings payload and writes only the config files it touches.
 */
export async function updateGlobalSettings(payload: Record<string, unknown>) {
  const { postizConfigPath, globalConfigPath } = getPaths();
  const brandConfig = await readJsonFile<Record<string, unknown>>(postizConfigPath, {});
  const globalConfig = await readJsonFile<Record<string, unknown>>(globalConfigPath, {});
  let brandChanged = false;
  let globalChanged = false;

  if (payload.timezone !== undefined) {
    if (typeof payload.timezone !== "string" || !isValidTimezone(payload.timezone)) {
      throw new Error("timezone must be a valid IANA time zone");
    }
    const posting = asRecord(brandConfig.posting);
    brandConfig.posting = { ...posting, personal: { ...asRecord(posting.personal), timezone: payload.timezone } };
    brandChanged = true;
  }
  if (payload.defaultGenerationModel !== undefined) {
    const model = modelName(payload.defaultGenerationModel, "defaultGenerationModel");
    brandConfig.imageGen = { ...asRecord(brandConfig.imageGen), model };
    brandChanged = true;
  }
  if (payload.defaultPublishingModel !== undefined) {
    globalConfig.publishModel = modelName(payload.defaultPublishingModel, "defaultPublishingModel");
    globalChanged = true;
  }
  if (payload.notificationChannel !== undefined) {
    if (!NOTIFICATION_CHANNELS.includes(payload.notificationChannel as (typeof NOTIFICATION_CHANNELS)[number])) {
      throw new Error(`notificationChannel must be one of ${NOTIFICATION_CHANNELS.join(", ")}`);
    }
    globalConfig.notifications = payload.notificationChannel;
    globalChanged = true;
  }
  if (payload.notificationEvents !== undefined) {
    const allowed: string[] = NOTIFICATION_EVENTS.map((event) => event.key);
    const events = payload.notificationEvents;
    if (!Array.isArray(events) || events.some((event) => typeof event !== "string" || !allowed.includes(event))) {
      throw new Error(`notificationEvents must be a subset of ${allowed.join(", ")}`);
    }
    globalConfig.notification_events = [...new Set(events as string[])];
    globalChanged = true;
  }

  await Promise.all([
    brandChanged ? writeJsonWithBackup(postizConfigPath, brandConfig) : null,
    globalChanged ? writeJsonWithBackup(globalConfigPath, globalConfig) : null,
  ]);
  invalidateCache();
  return getGlobalSettings();
}
