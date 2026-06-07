import { expect, test } from "@playwright/test";

test.describe("production build smoke checks", () => {
  test("serves the main app shell from the built artifact", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("dialog", { name: "Important information" })
    ).toBeVisible();
    await page.getByRole("button", { name: "I understand" }).click();
    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();
  });

  test("serves footer pages from the built artifact", async ({ page }) => {
    await page.goto("/settings/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Settings" })
    ).toBeVisible();
    await expect(
      page.locator(".field-label", { hasText: "Export parameters" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export parameters" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset parameters" })
    ).toBeVisible();
    await expect(page.getByLabel("Choose JSON parameter file")).toBeVisible();
    await expect(page.getByLabel("Save inputs on this device")).toBeVisible();

    await page.goto("/methodology/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Methodology" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "What the model projects",
      })
    ).toBeVisible();
  });
});
