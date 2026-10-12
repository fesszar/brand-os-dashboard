import { expect, test } from "@playwright/test";

test.describe("Phase 3: publishing + automation", () => {
  test.beforeEach(({ page }) => {
    page.on("pageerror", (error) => {
      throw error;
    });
  });

  test("publish history filters, expands and exports", async ({ page }) => {
    await page.goto("/publish-history");
    await expect(page.getByText("2 of 2 results")).toBeVisible();

    await page.getByLabel("Brand").selectOption("fessburn");
    await expect(page.getByText("1 of 2 results")).toBeVisible();
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      "/api/publish-history/export?brand=fessburn",
    );

    await page.getByRole("row", { name: /fessburn/ }).click();
    await expect(page.getByText("pz-201")).toBeVisible();
    await page.getByRole("button", { name: "View publish result JSON" }).click();
    await expect(page.getByText('"failed_targets"')).toBeVisible();
  });

  test("platform settings saves a brand override", async ({ page }) => {
    await page.goto("/platform-settings");
    await expect(page.getByText("••••••••4242")).toBeVisible();
    await expect(page.getByText("int-ig-002")).toBeVisible();

    await page.getByLabel("Brand to configure").selectOption("invoicerate");
    await page.locator("#brand-invoicerate-instagram-post_type").selectOption("reel");
    await page.getByRole("button", { name: "Save invoicerate" }).click();
    await expect(page.getByText("Saved invoicerate settings.")).toBeVisible();

    await page.reload();
    await page.getByLabel("Brand to configure").selectOption("invoicerate");
    await expect(page.locator("#brand-invoicerate-instagram-post_type")).toHaveValue("reel");
  });

  test("cron manager runs and toggles jobs", async ({ page }) => {
    await page.goto("/cron-manager");
    await expect(page.getByText("Daily at 09:00, 13:00")).toBeVisible();
    await expect(page.getByText("Every 45 minutes")).toBeVisible();

    const row = page.getByRole("row", { name: /invoicerate publish/ });
    await row.getByRole("button", { name: "Disable" }).click();
    await expect(page.getByText("invoicerate publish disabled.")).toBeVisible();
    await expect(row.getByRole("button", { name: "Enable" })).toBeVisible();

    const generate = page.getByRole("row", { name: /invoicerate generate drafts/ });
    await generate.getByRole("button", { name: "Run Now" }).click();
    await expect(page.getByText("Triggered invoicerate generate drafts.")).toBeVisible();
    await generate.getByRole("button", { name: /Show runs/ }).click();
    await expect(page.getByText("model timeout")).toBeVisible();
  });

  test("pipeline monitor and warmup render per brand", async ({ page }) => {
    await page.goto("/pipeline-monitor");
    await expect(page.getByTestId("pipeline-fessburn")).toContainText("1 script(s) still waiting for a video upload");
    await expect(page.getByTestId("pipeline-rottenswamp")).toContainText("No alerts");

    await page.goto("/warmup");
    const card = page.getByTestId("warmup-fessburn");
    await expect(card).toContainText("tiktok");
    await card.getByRole("button", { name: "Trigger Warmup" }).click();
    await expect(page.getByText("Warmup triggered for fessburn.")).toBeVisible();
    await expect(page.getByTestId("warmup-invoicerate").getByRole("button", { name: "Trigger Warmup" })).toBeDisabled();
  });
});
