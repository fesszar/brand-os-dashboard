export type SettingValue = string | boolean;

export type SettingField =
  | {
      key: string;
      label: string;
      kind: "select";
      options: string[];
      defaultValue: string;
      locked?: boolean;
      help?: string;
    }
  | { key: string; label: string; kind: "boolean"; defaultValue: boolean; help?: string }
  | { key: string; label: string; kind: "text"; defaultValue: string; help?: string };

export type PlatformSchema = { platform: string; label: string; fields: SettingField[] };

export type PlatformSettingsMap = Record<string, Record<string, SettingValue>>;

export const PLATFORM_SCHEMAS: PlatformSchema[] = [
  {
    platform: "tiktok",
    label: "TikTok",
    fields: [
      {
        key: "privacy_level",
        label: "Privacy level",
        kind: "select",
        options: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR"],
        defaultValue: "PUBLIC_TO_EVERYONE",
      },
      {
        key: "posting_method",
        label: "Posting method",
        kind: "select",
        options: ["UPLOAD"],
        defaultValue: "UPLOAD",
        locked: true,
        help: "UPLOAD is enforced. SELF_ONLY and DIRECT_POST are not allowed.",
      },
      { key: "disclose_ai", label: "AI-generated disclosure", kind: "boolean", defaultValue: true },
      { key: "brand_content", label: "Branded content toggle", kind: "boolean", defaultValue: false },
    ],
  },
  {
    platform: "instagram",
    label: "Instagram",
    fields: [
      {
        key: "post_type",
        label: "Post type",
        kind: "select",
        options: ["carousel", "reel", "story"],
        defaultValue: "carousel",
      },
      {
        key: "hashtag_strategy",
        label: "Hashtag strategy",
        kind: "select",
        options: ["none", "minimal", "mixed", "aggressive"],
        defaultValue: "minimal",
      },
    ],
  },
  {
    platform: "facebook",
    label: "Facebook",
    fields: [
      { key: "page", label: "Page", kind: "text", defaultValue: "" },
      { key: "cross_post", label: "Cross-post from Instagram", kind: "boolean", defaultValue: false },
    ],
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    fields: [
      {
        key: "page_type",
        label: "Account type",
        kind: "select",
        options: ["personal", "company"],
        defaultValue: "personal",
      },
    ],
  },
  {
    platform: "x",
    label: "X / Twitter",
    fields: [
      {
        key: "post_mode",
        label: "Post mode",
        kind: "select",
        options: ["single", "thread"],
        defaultValue: "single",
      },
    ],
  },
];

/**
 * Returns schema defaults for every platform field.
 */
export function schemaDefaults(): PlatformSettingsMap {
  return Object.fromEntries(
    PLATFORM_SCHEMAS.map((schema) => [
      schema.platform,
      Object.fromEntries(schema.fields.map((field) => [field.key, field.defaultValue])),
    ]),
  );
}

/**
 * Layers per-brand overrides on top of global defaults.
 */
export function mergeSettings(
  defaults: PlatformSettingsMap,
  overrides: PlatformSettingsMap,
): PlatformSettingsMap {
  return Object.fromEntries(
    PLATFORM_SCHEMAS.map((schema) => [
      schema.platform,
      { ...defaults[schema.platform], ...overrides[schema.platform] },
    ]),
  );
}

/**
 * Validates a (possibly partial) settings map against the schema, rejecting
 * unknown platforms/keys and out-of-range values.
 */
export function validateSettingsMap(
  value: unknown,
): { ok: true; value: PlatformSettingsMap } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "settings must be an object keyed by platform" };
  }

  const result: PlatformSettingsMap = {};
  for (const [platform, fields] of Object.entries(value as Record<string, unknown>)) {
    const schema = PLATFORM_SCHEMAS.find((entry) => entry.platform === platform);
    if (!schema) {
      return { ok: false, error: `unknown platform '${platform}'` };
    }
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return { ok: false, error: `${platform} settings must be an object` };
    }

    const cleaned: Record<string, SettingValue> = {};
    for (const [key, raw] of Object.entries(fields as Record<string, unknown>)) {
      const field = schema.fields.find((entry) => entry.key === key);
      if (!field) {
        return { ok: false, error: `unknown setting '${platform}.${key}'` };
      }
      if (field.kind === "boolean" && typeof raw !== "boolean") {
        return { ok: false, error: `${platform}.${key} must be true or false` };
      }
      if (field.kind !== "boolean" && typeof raw !== "string") {
        return { ok: false, error: `${platform}.${key} must be a string` };
      }
      if (field.kind === "select" && !field.options.includes(raw as string)) {
        return { ok: false, error: `${platform}.${key} must be one of ${field.options.join(", ")}` };
      }
      cleaned[key] = raw as SettingValue;
    }
    result[platform] = cleaned;
  }

  return { ok: true, value: result };
}
