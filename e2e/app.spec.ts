import { test, expect, type Page } from "@playwright/test";

test.describe("app end-to-end journeys", () => {
  test("acknowledges first run, switches modes, and keeps expert mode usable", async ({
    page,
  }) => {
    await startFirstRun(page);

    const acknowledgement = page.getByRole("dialog", {
      name: "Important information",
    });
    await expect(acknowledgement).toBeVisible();
    await page.getByRole("button", { name: "I understand" }).click();
    await expect(acknowledgement).toBeHidden();

    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Simplified retirement journey/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "Simplified retirement journey" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "About you and your target" })
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Work out what I need to retire early/i })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Work out what I need to retire early",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your retirement target" })
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: /Work through every setting with full control/i,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Optional sections" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await fillExactNumber(page, "Target retirement age exact value", "60");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current SIPP pot (£)", "125000");
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current ISA pot (£)", "40000");
    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Monthly pension projection table" })
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("completes the simple journey and shows the shared comparison interface", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "simple");

    await fillCurrency(page, "Target retirement income (£ per year)", "32000");
    await page.getByRole("button", { name: "Next" }).click();

    await fillCurrency(page, "Accrued pension to date (£ per year)", "17500");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pension Summary" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Save this result as a scenario" })
    ).toBeVisible();

    await page.getByLabel("Scenario name").fill("Simple journey check");
    await page.getByRole("button", { name: "Add to comparison" }).click();
    await expect(
      page.getByRole("heading", { name: "Saved scenarios" })
    ).toBeVisible();
    await expect(
      page.locator(
        '.comparison-saved-section input[value="Simple journey check"]'
      )
    ).toBeVisible();
  });

  test("completes the bridge journey and opens the footer information pages", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "bridge");

    await fillExactNumber(page, "Target retirement age exact value", "58");
    await fillCurrency(
      page,
      "Income you want in retirement (£ per year)",
      "34000"
    );
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await fillCurrency(
      page,
      "Alpha Pension Accrued at Last Statement (£ per year)",
      "18000"
    );
    await fillExactNumber(
      page,
      "Planned Alpha Pension Draw Age exact value",
      "60"
    );
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Next" }).click();

    await fillCurrency(page, "Current ISA balance (£)", "35000");
    await fillCurrency(page, "Current SIPP balance (£)", "95000");
    await fillExactNumber(page, "SIPP access age exact value", "58");
    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Monthly pension projection table" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Save this result as a scenario" })
    ).toBeVisible();

    await page.getByLabel("Scenario name").fill("Bridge journey check");
    await page.getByRole("button", { name: "Add to comparison" }).click();
    await expect(
      page.getByRole("heading", { name: "Saved scenarios" })
    ).toBeVisible();
    await expect(
      page.locator(
        '.comparison-saved-section input[value="Bridge journey check"]'
      )
    ).toBeVisible();

    await assertFooterPage(page, "Settings", "Export parameters");
    await assertFooterPage(page, "Privacy", "What we collect");
    await assertFooterPage(page, "Methodology", "What the model projects");
    await assertFooterPage(page, "About", "What it is");
  });
});

async function startFirstRun(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function acknowledgeAndOpenMode(
  page: Page,
  mode: "simple" | "bridge" | "expert"
) {
  await startFirstRun(page);
  await page.getByRole("button", { name: "I understand" }).click();

  if (mode === "simple") {
    await page
      .getByRole("button", { name: /Simplified retirement journey/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "About you and your target" })
    ).toBeVisible();
    return;
  }

  if (mode === "bridge") {
    await page
      .getByRole("button", { name: /Work out what I need to retire early/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your retirement target" })
    ).toBeVisible();
    return;
  }

  await page
    .getByRole("button", {
      name: /Work through every setting with full control/i,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Optional sections" })
  ).toBeVisible();
}

async function fillCurrency(page: Page, label: string, value: string) {
  const input = page.getByRole("spinbutton", { name: label, exact: true });
  await input.fill(value);
  await input.blur();
  await expect(input).toHaveValue(value);
}

async function fillExactNumber(page: Page, label: string, value: string) {
  const input = page.getByRole("spinbutton", { name: label, exact: true });
  await input.fill(value);
  await input.press("Enter");
  await expect(input).toHaveValue(value);
}

async function assertFooterPage(
  page: Page,
  pageName: "About" | "Methodology" | "Privacy" | "Settings",
  sectionHeading: string
) {
  const path = `/${pageName.toLowerCase()}/`;
  const link = page
    .getByRole("contentinfo")
    .getByRole("link", { name: pageName });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(link).toHaveAttribute(
    "href",
    new RegExp(`${pageName.toLowerCase()}/$`)
  );
  await Promise.all([page.waitForURL(new RegExp(`${path}$`)), link.click()]);
  await page.waitForLoadState("domcontentloaded");

  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: pageName })
  ).toBeVisible();
  if (pageName === "Settings") {
    await expect(
      page.locator(".field-label", { hasText: sectionHeading })
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: sectionHeading,
        exact: true,
      })
    ).toBeVisible();
  }

  if (pageName === "Settings") {
    const exportButton = page.getByRole("button", {
      name: "Export parameters",
    });
    const resetButton = page.getByRole("button", {
      name: "Reset parameters",
    });

    await expect(exportButton).toBeVisible();
    await expect(resetButton).toBeVisible();
    await expect(page.getByLabel("Choose JSON parameter file")).toBeVisible();
    await expect(page.getByLabel("Save inputs on this device")).toBeChecked();

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^cs-pension-parameters-\d{4}-\d{2}-\d{2}\.json$/
    );
    await expect(page.getByRole("status")).toHaveText("Parameters exported.");

    await resetButton.click();
    await expect(page.getByRole("status")).toHaveText("Parameters reset.");

    await page.getByLabel("Choose JSON parameter file").evaluate((element) => {
      const input = element as HTMLInputElement;
      const file = new File(
        [
          JSON.stringify({
            desiredRetirementIncome: 45678,
          }),
        ],
        "parameters.json",
        { type: "application/json" }
      );
      const dataTransfer = new DataTransfer();

      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByRole("status")).toHaveText("Parameters loaded.");
    await expect(page.getByLabel("Choose JSON parameter file")).toHaveValue("");
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("cs-pension-modeller.settings")
        )
      )
      .toContain('"desiredRetirementIncome":45678');

    await page.getByLabel("Save inputs on this device").uncheck();
    await expect(
      page.getByLabel("Save inputs on this device")
    ).not.toBeChecked();
    await expect(page.getByRole("status")).toHaveText(
      "Local saving turned off. Saved parameters were removed from this browser."
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("cs-pension-modeller.settings")
        )
      )
      .toBeNull();
  }
}

async function renderDeferredComparisonContent(page: Page) {
  await page
    .getByRole("region", { name: "Comparison results" })
    .scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    const steps = [0.5, 0.9, 1.4, 2.2];

    for (const multiplier of steps) {
      window.scrollBy(0, window.innerHeight * multiplier);
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  });
}
