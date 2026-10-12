import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPlatformSettings, maskSecret, updatePlatformSettings } from "@/lib/platform-settings";
import { mergeSettings, schemaDefaults, validateSettingsMap } from "@/lib/platform-settings-schema";
import { writeJsonState } from "@/lib/workspace";

describe("platform settings schema", () => {
  it("rejects disallowed TikTok posting methods", () => {
    const result = validateSettingsMap({ tiktok: { posting_method: "DIRECT_POST" } });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown platforms, keys and wrong types", () => {
    expect(validateSettingsMap({ myspace: {} }).ok).toBe(false);
    expect(validateSettingsMap({ tiktok: { color: "red" } }).ok).toBe(false);
    expect(validateSettingsMap({ tiktok: { disclose_ai: "yes" } }).ok).toBe(false);
  });

  it("merges overrides over defaults", () => {
    const merged = mergeSettings(schemaDefaults(), { instagram: { post_type: "reel" } });
    expect(merged.instagram.post_type).toBe("reel");
    expect(merged.tiktok.posting_method).toBe("UPLOAD");
  });

  it("masks secrets", () => {
    expect(maskSecret("")).toBe("");
    expect(maskSecret("abcdef1234")).toBe("••••••••1234");
  });
});

describe("platform settings persistence", () => {
  let workspace: string;
  const configPath = () => path.join(workspace, "brand-marketing", "config.json");

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(os.tmpdir(), "brand-os-"));
    process.env.WORKSPACE = workspace;
    await writeJsonState(configPath(), {
      postiz: { apiKey: "secret-key-9876", invoicerate: { tiktok: "int-1" } },
      posting: { invoicerate: { schedule: ["0900"] } },
    });
  });

  afterEach(async () => {
    delete process.env.WORKSPACE;
    await rm(workspace, { recursive: true, force: true });
  });

  it("stores brand overrides without touching other config keys", async () => {
    await updatePlatformSettings({ brandId: "invoicerate", overrides: { instagram: { post_type: "reel" } } });

    const saved = JSON.parse(await readFile(configPath(), "utf8"));
    expect(saved.posting.invoicerate.schedule).toEqual(["0900"]);
    expect(saved.platform_settings.brands.invoicerate).toEqual({ instagram: { post_type: "reel" } });

    const settings = await getPlatformSettings(["invoicerate"]);
    expect(settings.brands[0].effective.instagram.post_type).toBe("reel");
    expect(settings.brands[0].integrations).toEqual({ tiktok: "int-1" });
    expect(settings.postiz.apiKeyMasked).toBe("••••••••9876");
    expect(JSON.stringify(settings)).not.toContain("secret-key");
  });

  it("refuses invalid defaults and leaves the file unchanged", async () => {
    const before = await readFile(configPath(), "utf8");
    await expect(
      updatePlatformSettings({ defaults: { tiktok: { posting_method: "SELF_ONLY" } } }),
    ).rejects.toThrow(/posting_method/);
    expect(await readFile(configPath(), "utf8")).toBe(before);
  });
});
