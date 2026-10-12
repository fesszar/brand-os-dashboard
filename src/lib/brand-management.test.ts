import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appendJsonLine, invalidateCache, readJsonLines, writeJsonState } from "@/lib/workspace";
import { cloneBrand, createBrand, decommissionBrand } from "@/lib/brand-management";
import { getBrandList } from "@/lib/brand-os";
import { getGlobalSettings, updateGlobalSettings } from "@/lib/global-settings";

let workspace: string;
const originalPath = process.env.PATH;
const brandFile = (...parts: string[]) => path.join(workspace, "skills", "brand-os", "brands", ...parts);

beforeEach(async () => {
  workspace = await mkdtemp(path.join(os.tmpdir(), "brand-os-mgmt-"));
  process.env.WORKSPACE = workspace;
  process.env.PATH = "/nonexistent";
  invalidateCache();
  await writeJsonState(brandFile("invoicerate", "storybook.json"), { brand: { name: "InvoiceRate" } });
  await writeJsonState(brandFile("invoicerate", "hook-rotation.json"), { angles: [{ id: "a1" }] });
  await appendJsonLine(brandFile("invoicerate", "experiments.jsonl"), { brand_id: "invoicerate", aggregate: { views: 1 } });
  await writeJsonState(path.join(workspace, "brand-marketing", "config.json"), { postiz: { apiKey: "secret" } });
});

afterEach(async () => {
  delete process.env.WORKSPACE;
  process.env.PATH = originalPath;
  invalidateCache();
  await rm(workspace, { recursive: true, force: true });
});

describe("brand management", () => {
  it("creates an active brand with a storybook skeleton", async () => {
    await createBrand({ brandId: "relaystack_2", name: "Relay", platforms: ["tiktok", "linkedin"] });
    const storybook = JSON.parse(await readFile(brandFile("relaystack_2", "storybook.json"), "utf8"));
    expect(storybook.brand).toMatchObject({ id: "relaystack_2", name: "Relay" });
    expect(Object.keys(storybook.channels)).toEqual(["tiktok", "linkedin"]);
    expect((await getBrandList()).find((b) => b.id === "relaystack_2")?.status).toBe("active");
  });

  it("rejects invalid ids, duplicates and unknown platforms", async () => {
    await expect(createBrand({ brandId: "Bad Id", name: "x" })).rejects.toThrow(/brand id/);
    await expect(createBrand({ brandId: "invoicerate", name: "x" })).rejects.toThrow(/already exists/);
    await expect(createBrand({ brandId: "newbrand", name: "x", platforms: ["myspace"] })).rejects.toThrow(/platforms/);
  });

  it("clones storybook and hooks without analytics history", async () => {
    await cloneBrand({ sourceBrandId: "invoicerate", brandId: "invoicerate_eu" });
    const storybook = JSON.parse(await readFile(brandFile("invoicerate_eu", "storybook.json"), "utf8"));
    expect(storybook.brand).toEqual({ name: "InvoiceRate Clone", id: "invoicerate_eu" });
    expect(storybook.lifecycle.cloned_from).toBe("invoicerate");
    expect(JSON.parse(await readFile(brandFile("invoicerate_eu", "hook-rotation.json"), "utf8")).angles).toHaveLength(1);
    expect(await readJsonLines(brandFile("invoicerate_eu", "experiments.jsonl"))).toEqual([]);
    await expect(cloneBrand({ sourceBrandId: "ghost", brandId: "ghost_2" })).rejects.toThrow(/does not exist/);
  });

  it("decommissions a brand and reflects it in the brand list", async () => {
    const result = await decommissionBrand("invoicerate");
    expect(result.status).toBe("decommissioned");
    expect((await getBrandList()).find((b) => b.id === "invoicerate")?.status).toBe("decommissioned");
  });
});

describe("global settings", () => {
  it("never exposes raw config and validates updates", async () => {
    const settings = await getGlobalSettings();
    expect(JSON.stringify(settings)).not.toContain("secret");
    expect(settings.postizConfigured).toBe(true);

    await expect(updateGlobalSettings({ timezone: "Mars/Olympus" })).rejects.toThrow(/time zone/);
    await expect(updateGlobalSettings({ notificationEvents: ["nope"] })).rejects.toThrow(/subset/);

    const next = await updateGlobalSettings({ timezone: "America/New_York", notificationEvents: ["cron_failed"], notificationChannel: "none" });
    expect(next).toMatchObject({ timezone: "America/New_York", notificationEvents: ["cron_failed"], notificationChannel: "none" });
    const config = JSON.parse(await readFile(path.join(workspace, "brand-marketing", "config.json"), "utf8"));
    expect(config.postiz.apiKey).toBe("secret");
  });
});
