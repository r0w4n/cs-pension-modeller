import AxeBuilderClass from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("accessibility", () => {
  test("first-run acknowledgement dialog has no detectable axe violations", async ({
    page,
  }) => {
    await startFirstRun(page);

    await expect(
      page.getByRole("dialog", { name: "Important information" })
    ).toBeVisible();

    await expectNoAxeViolations(page, "first-run acknowledgement dialog");
  });

  test("mode selection screen has no detectable axe violations", async ({
    page,
  }) => {
    await acknowledgeFirstRun(page);

    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();

    await expectNoAxeViolations(page, "mode selection screen");
  });

  test("simple journey entry screen has no detectable axe violations", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "simple");

    await expectNoAxeViolations(page, "simple journey entry screen");
  });

  test("expert journey entry screen has no detectable axe violations", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await expectNoAxeViolations(page, "expert journey entry screen");
  });

  test("bridge journey results have no detectable axe violations", async ({
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

    await expectNoAxeViolations(page, "bridge journey results");
  });

  for (const staticPage of [
    { path: "/settings/", heading: "Settings" },
    { path: "/about/", heading: "About" },
    { path: "/methodology/", heading: "Methodology" },
    { path: "/privacy/", heading: "Privacy" },
  ]) {
    test(`${staticPage.heading} page has no detectable axe violations`, async ({
      page,
    }) => {
      await page.goto(staticPage.path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: staticPage.heading,
        })
      ).toBeVisible();

      await expectNoAxeViolations(page, `${staticPage.heading} page`);
    });
  }
});

async function expectNoAxeViolations(page: Page, context: string) {
  const scanResults = await new AxeBuilderClass({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  if (scanResults.violations.length > 0) {
    throw new Error(formatViolations(context, scanResults.violations));
  }
}

function formatViolations(
  context: string,
  violations: Awaited<ReturnType<AxeBuilderClass["analyze"]>>["violations"]
) {
  if (violations.length === 0) {
    return `${context} has no detectable axe violations.`;
  }

  return [
    `${context} has ${violations.length} detectable axe violation(s).`,
    ...violations.map((violation) => {
      const nodes = violation.nodes
        .map((node) => node.target.join(" "))
        .slice(0, 5)
        .join("; ");

      return [
        `${violation.id}: ${violation.help}`,
        `impact=${violation.impact ?? "unknown"}`,
        `nodes=${nodes || "n/a"}`,
      ].join(" | ");
    }),
  ].join("\n");
}

async function startFirstRun(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function acknowledgeFirstRun(page: Page) {
  await startFirstRun(page);
  await page.getByRole("button", { name: "I understand" }).click();
}

async function acknowledgeAndOpenMode(
  page: Page,
  mode: "simple" | "bridge" | "expert"
) {
  await acknowledgeFirstRun(page);

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
