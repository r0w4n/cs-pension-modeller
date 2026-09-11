import { expect, test } from "@playwright/test";

async function interceptAnalyticsRequests(
  page: import("@playwright/test").Page
) {
  const urls: string[] = [];

  await page.route(
    /https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com)\//,
    async (route) => {
      urls.push(route.request().url());
      await route.abort();
    }
  );

  return urls;
}

test.describe("production build smoke checks", () => {
  test("serves the main app shell from the built artifact", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("dialog", { name: "Important information" })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
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
      page.getByRole("button", { name: "Clear all data" })
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
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Important assumptions and omissions",
      })
    ).toBeVisible();

    const methodologyHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(methodologyHorizontalOverflow).toBeLessThanOrEqual(1);

    await page.goto("/acceptance/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Acceptance criteria" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "What this page shows",
      })
    ).toBeVisible();
    await expect(page.getByText("Alpha pension modelling")).toBeVisible();

    const acceptanceHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(acceptanceHorizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("gates analytics on direct navigation, consent changes and clearing data", async ({
    page,
  }) => {
    const analyticsUrls = await interceptAnalyticsRequests(page);

    await page.goto("/privacy/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy" })
    ).toBeVisible();
    expect(analyticsUrls).toHaveLength(0);

    await page.goto("/");
    await page
      .getByRole("button", { name: "Continue without analytics" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();
    await page.goto("/methodology/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Methodology" })
    ).toBeVisible();
    expect(analyticsUrls).toHaveLength(0);

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/");
    await page
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
    await expect.poll(() => analyticsUrls.length).toBeGreaterThanOrEqual(1);
    expect(
      analyticsUrls.some((url) =>
        url.startsWith("https://www.googletagmanager.com/gtag/js?id=G-TEST123")
      )
    ).toBe(true);

    await page.goto("/settings/");
    await page.getByLabel("Allow analytics").uncheck();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("cs-pension-modeller.analyticsConsent")
        )
      )
      .toBe("false");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.gtag === undefined &&
            document.getElementById("google-analytics-script") === null
        )
      )
      .toBe(true);

    const requestCountAfterWithdrawal = analyticsUrls.length;
    await page.goto("/acceptance/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Acceptance criteria" })
    ).toBeVisible();
    expect(analyticsUrls).toHaveLength(requestCountAfterWithdrawal);

    await page.goto("/settings/");
    await page.getByLabel("Allow analytics").check();
    await expect
      .poll(() => analyticsUrls.length)
      .toBeGreaterThan(requestCountAfterWithdrawal);
    await page.getByRole("button", { name: "Clear all data" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.gtag === undefined &&
            document.getElementById("google-analytics-script") === null
        )
      )
      .toBe(true);
  });
});
