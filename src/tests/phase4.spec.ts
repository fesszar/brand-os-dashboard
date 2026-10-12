import { expect, test } from "@playwright/test";

test.describe("Phase 4: analytics + settings", () => {
  test.beforeEach(({ page }) => {
    page.on("pageerror", (error) => {
      throw error;
    });
  });

  test("analytics overview compares brands and drills into one brand", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("gideonawolesi · tiktok")).toBeVisible();
    await expect(page.getByRole("row", { name: /fessburn 1 1.2K 60 5.00%/ })).toBeVisible();

    await page.getByLabel("Brand", { exact: true }).selectOption("invoicerate");
    await expect(page).toHaveURL(/brand=invoicerate/);
    await expect(page.getByText("Rate card")).toBeVisible();

    const chart = page.locator("figure svg").first();
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height / 2);
    await expect(page.getByText("2026-02-06 · 6K")).toBeVisible();
  });

  test("funnel shows logged conversion numbers", async ({ page }) => {
    await page.goto("/analytics/funnel");
    await expect(page.getByText("44.4% of DMs")).toBeVisible();
    await expect(page.getByText("9 DMs · 3 leads")).toBeVisible();
    await expect(page.getByRole("row", { name: /2026-02-16 6 4 1/ })).toBeVisible();
  });

  test("experiments show significance and can be created and archived", async ({ page }) => {
    await page.goto("/experiments");
    const card = page.getByTestId("experiment-hook-length");
    await expect(card).toContainText("Winner: question");
    await expect(card).toContainText("significant");

    await page.getByLabel("Experiment brand").selectOption("gideonawolesi");
    await page.getByLabel("Hypothesis").fill("Carousel CTAs drive more DMs");
    await page.getByLabel("Variants").fill("reel, carousel");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Experiment created for gideonawolesi.")).toBeVisible();
    await expect(page.getByTestId("experiment-carousel-ctas-drive-more-dms")).toContainText("reel");

    await card.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByTestId("experiment-hook-length")).toHaveCount(0);
    await page.getByLabel("Status filter").selectOption("archived");
    await expect(page.getByTestId("experiment-hook-length")).toContainText("archived");
  });

  test("global settings persist", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Timezone").selectOption("America/New_York");
    await page.getByLabel("Draft generated").check();
    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Timezone")).toHaveValue("America/New_York");
    await expect(page.getByLabel("Draft generated")).toBeChecked();
  });

  test("brands can be added, cloned and decommissioned", async ({ page }) => {
    await page.goto("/brands");
    await page.getByRole("button", { name: "Add Brand" }).click();
    const dialog = page.getByRole("dialog", { name: "Add brand" });
    await dialog.getByLabel("Brand id").fill("e2e_brand");
    await dialog.getByLabel("Display name").fill("E2E Brand");
    await dialog.getByRole("button", { name: "Create Brand" }).click();
    await expect(page.getByText("Created brand e2e_brand.")).toBeVisible();

    const card = page.getByTestId("brand-card-e2e_brand");
    await card.getByRole("button", { name: "Clone" }).click();
    const cloneDialog = page.getByRole("dialog", { name: "Clone E2E Brand" });
    await cloneDialog.getByLabel("New brand id").fill("e2e_brand_two");
    await cloneDialog.getByRole("button", { name: "Clone Brand" }).click();
    await expect(page.getByText("Cloned to e2e_brand_two.")).toBeVisible();
    await expect(page.getByTestId("brand-card-e2e_brand_two")).toContainText("E2E Brand Clone");

    page.once("dialog", (confirm) => confirm.accept());
    await card.getByRole("button", { name: "Decommission" }).click();
    await expect(page.getByText("E2E Brand decommissioned; 0 cron job(s) disabled.")).toBeVisible();
    await expect(card.getByText("decommissioned", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Decommission" })).toBeDisabled();
  });
});
