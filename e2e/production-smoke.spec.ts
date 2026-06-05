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

  test("serves static content pages from the built artifact", async ({
    page,
  }) => {
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
