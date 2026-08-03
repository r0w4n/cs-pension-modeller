import { test, expect, type Locator, type Page } from "@playwright/test";

test.describe("app end-to-end journeys", () => {
  test("acknowledges first run, switches modes, and keeps expert mode usable", async ({
    page,
  }, testInfo) => {
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
    await expect(
      page.getByRole("heading", { name: "Personal details" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Retirement income target" })
    ).toBeVisible();
    await fillExactNumber(page, "Target retirement age exact value", "60");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current SIPP pot (£)", "125000");
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current ISA pot (£)", "40000");
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current LISA pot (£)", "10000");
    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expectProjectionTableForViewport(page, testInfo.project.name);

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
    await clickNextAndExpectStep(page, "Your Civil Service pensions");
    await clickNextAndExpectStep(page, "Your Alpha pension");

    await fillCurrency(page, "Accrued pension to date (£ per year)", "17500");
    await clickNextAndExpectStep(page, "Added pension");
    await clickNextAndExpectStep(page, "Alpha EPA");

    await clickNextAndExpectStep(page, "Additional guaranteed income");
    await addAdditionalIncome(page, "Simple journey annuity", "4000", "67");
    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Retirement income summary" })
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

  test("expert mode can exclude Alpha pension", async ({ page }) => {
    await acknowledgeAndOpenMode(page, "expert");

    const alphaToggle = page.getByRole("checkbox", { name: "Alpha" });
    await expect(alphaToggle).toBeChecked();
    await alphaToggle.uncheck();

    await expect(alphaToggle).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: /Alpha pension details/i })
    ).toHaveCount(0);
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"showAlpha":false');

    await navigateToJourneyResult(page);
    await renderDeferredComparisonContent(page);

    await expect(page.getByLabel(/Start Alpha, age \d+/)).toHaveCount(0);
    await expect(page.getByText("Monthly Alpha pension")).toHaveCount(0);
    await expect(
      page.getByLabel("Income by age range table").getByText(/Alpha pension/)
    ).toHaveCount(0);
  });

  test("completes the bridge journey", async ({ page }, testInfo) => {
    test.slow();

    await acknowledgeAndOpenMode(page, "bridge");

    await fillExactNumber(page, "Target retirement age exact value", "58");
    await fillCurrency(
      page,
      "Income you want in retirement (£ per year)",
      "34000"
    );
    await clickNextAndExpectStep(page, "Your personal details");

    await clickNextAndExpectStep(page, "Your Civil Service pensions");
    await clickNextAndExpectStep(page, "Your Alpha pension");

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
    await clickNextAndExpectStep(page, "State Pension");

    await clickNextAndExpectStep(page, "Additional guaranteed income");
    await addAdditionalIncome(
      page,
      "Previous employer DB pension",
      "5000",
      "60"
    );
    await clickNextAndExpectStep(page, "Your bridging pots");

    await fillCurrency(page, "Current ISA balance (£)", "35000");
    await fillCurrency(page, "Current LISA balance (£)", "12000");
    await fillExactNumber(page, "LISA access age exact value", "60");
    await fillCurrency(page, "Current SIPP balance (£)", "95000");
    await fillExactNumber(page, "SIPP access age exact value", "58");
    await expect(
      page.getByRole("region", { name: "Income-target funding priority" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "SIPP withdrawal strategy" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", {
        name: "ISA withdrawal strategy",
        exact: true,
      })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Show my answer" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Show my answer" }).click();
    await renderDeferredComparisonContent(page);

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toBeVisible();
    await expect(
      page.getByText("Avoidable flexible-fund surplus", { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Your flexible withdrawals may be higher than needed",
      })
    ).toHaveCount(0);
    await expectProjectionTableForViewport(page, testInfo.project.name);
    await expect(
      page.getByRole("heading", { name: "Save this result as a scenario" })
    ).toBeVisible();
    await expect(
      page.getByText("Previous employer DB pension").first()
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
  });

  test("opens the footer information pages", async ({ page }) => {
    await startFirstRun(page);
    await page.getByRole("button", { name: "I understand" }).click();
    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();

    await assertFooterPage(page, "Settings", "Export parameters");
    await assertFooterPage(page, "Privacy", "What we collect");
    await assertFooterPage(page, "Methodology", "What the model projects");
    await assertFooterPage(page, "Acceptance criteria", "What this page shows");
    await assertFooterPage(page, "About", "What it is");
  });

  test("configures, persists, and reports Go-Go, Slow-Go, No-Go spending", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(
      page.getByRole("heading", { name: "Personal details" })
    ).toBeVisible();
    await fillExactNumber(page, "Life Expectancy (Age) exact value", "95");
    await expect(
      page.getByRole("slider", { name: "Target retirement age" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("spinbutton", {
        name: "Retirement Living Standards target (£ per year)",
      })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Retirement income target" })
    ).toBeVisible();
    await expect(page.locator(".journey-progress")).toHaveText("Step 3 of 10");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Personal details" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Retirement income target" })
    ).toBeVisible();
    const retirementAgeControl = page.getByRole("slider", {
      name: "Target retirement age",
    });
    await expect(retirementAgeControl).toHaveValue("68");

    await page.getByRole("button", { name: "£45,400" }).click();

    const targetControl = page.getByRole("spinbutton", {
      name: "Retirement Living Standards target (£ per year)",
    });
    const strategyControl = page.getByRole("combobox", {
      name: "Spending strategy",
    });
    await expect(targetControl).toHaveValue("45400");
    await expect(strategyControl).toHaveValue("FLAT");
    expect(
      await targetControl.evaluate(
        (target, strategy) =>
          Boolean(
            target.compareDocumentPosition(strategy as Node) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
        await strategyControl.elementHandle()
      )
    ).toBe(true);

    await strategyControl.selectOption("SPENDING_SMILE");
    await assertRetirementTargetGrid(
      page,
      retirementAgeControl,
      targetControl,
      strategyControl
    );

    const noGoStartAge = page.getByRole("slider", {
      name: "No-go years start age",
    });
    await noGoStartAge.fill("85");
    await noGoStartAge.dispatchEvent("pointerup");
    await expect(noGoStartAge).toHaveValue("85");

    await page.getByRole("button", { name: "Back" }).click();
    await fillExactNumber(page, "Life Expectancy (Age) exact value", "80");
    await page.getByRole("button", { name: "Next" }).click();
    const cappedNoGoStartAge = page.getByRole("slider", {
      name: "No-go years start age",
    });
    await expect(cappedNoGoStartAge).toHaveValue("80");
    await expect(cappedNoGoStartAge).toHaveAttribute("max", "80");
    await expect(
      page.getByText(/No-go age cannot be later than your modelled life/)
    ).toHaveCount(0);

    const slowGoStartAge = page.getByRole("slider", {
      name: "Slow-go years start age",
    });
    const slowGoStartAgeExact = page.getByRole("spinbutton", {
      name: "Slow-go years start age exact value",
    });
    await slowGoStartAgeExact.fill("68");
    await expect(slowGoStartAge).toHaveValue("69");
    await expect(
      page.getByText("Slow-go years must start after your retirement age.")
    ).toHaveCount(0);
    await slowGoStartAgeExact.fill("75");
    await expect(slowGoStartAge).toHaveValue("75");

    await slowGoStartAge.fill("76");
    await expect(
      page.getByRole("spinbutton", {
        name: "Slow-go years start age exact value",
      })
    ).toHaveValue("76");
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"slowGoStartAge":75');
    await slowGoStartAge.dispatchEvent("pointerup");
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"slowGoStartAge":76');

    const slowGoPercentage = page.getByRole("slider", {
      name: "Slow-go years percentage of Retirement Living Standards target",
    });
    await slowGoPercentage.fill("80");
    await expect(
      page.getByRole("spinbutton", {
        name: "Slow-go years percentage exact value",
      })
    ).toHaveValue("80");
    await expect(
      page.getByText("£38,590 per year", { exact: true })
    ).toBeVisible();
    await expect(page.locator("#spending-profile-description")).toContainText(
      "Slow-go annual spending is £38,590"
    );
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"slowGoPercentage":85');
    await slowGoPercentage.dispatchEvent("pointerup");
    await expect(
      page.getByText("£36,320 per year", { exact: true })
    ).toBeVisible();
    await expect(page.locator("#spending-profile-description")).toContainText(
      "Slow-go annual spending is £36,320"
    );
    await expect(
      page.getByText("Annual spending target (£ per year) by age")
    ).toBeVisible();
    await expect(page.getByTestId("spending-profile-y-axis")).toContainText(
      "£50,000"
    );
    await expect(page.getByTestId("spending-profile-y-axis")).toContainText(
      "£40,000"
    );
    await expect(page.getByTestId("spending-profile-y-axis")).toContainText(
      "£30,000"
    );
    await expect(page.getByTestId("spending-profile-y-axis-tick")).toHaveCount(
      6
    );
    await expect(page.getByTestId("spending-profile-y-axis")).not.toContainText(
      "£45,400"
    );
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"slowGoPercentage":80');
    await expect(
      page.getByRole("img", {
        name: "Go-Go, Slow-Go, No-Go spending profile",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("slider", {
        name: "Go-go years percentage of Retirement Living Standards target",
      })
    ).toHaveValue("100");
    await expect(page.getByText(/Go-go annual spending/i)).not.toBeVisible();

    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"spendingStrategyType":"SPENDING_SMILE"');

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Optional sections" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("combobox", { name: "Spending strategy" })
    ).toHaveValue("SPENDING_SMILE");
    await expect(
      page.getByRole("slider", {
        name: "Slow-go years percentage of Retirement Living Standards target",
      })
    ).toHaveValue("80");
    await expect(
      page.getByRole("slider", { name: "Slow-go years start age" })
    ).toHaveValue("76");

    await navigateToJourneyResult(page);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Go-Go, Slow-Go, No-Go",
      })
    ).not.toBeVisible();
    await expect(page.locator(".spending-smile-results")).toHaveCount(0);

    const comparisonResults = page.getByRole("region", {
      name: "Comparison results",
    });
    await renderDeferredComparisonContent(page);
    await expect(
      comparisonResults.getByText("Spending strategy", { exact: true })
    ).toBeVisible();
    await expect(
      comparisonResults
        .getByText("Go-Go, Slow-Go, No-Go", { exact: true })
        .first()
    ).toBeVisible();
    await expect(
      comparisonResults.getByText("Slow-go target", { exact: true })
    ).toBeVisible();
    await expect(
      comparisonResults.getByText("No-go starts", { exact: true })
    ).toBeVisible();

    const targetPath = page.locator(".bridge-target-line").first();
    await expect(targetPath).toHaveAttribute("d", /.+/);
    expect(await countDistinctPathYValues(targetPath)).toBeGreaterThanOrEqual(
      3
    );

    const slowGoBoundaryHandle = page.getByTestId(
      "bridge-marker-slowGoStartAge"
    );
    await expect(slowGoBoundaryHandle).toHaveAttribute("aria-valuenow", "76");
    await slowGoBoundaryHandle.scrollIntoViewIfNeeded();
    const slowGoBoundaryBox = await requiredBox(slowGoBoundaryHandle);
    const targetPathBeforeBoundaryDrag = await targetPath.getAttribute("d");
    await page.mouse.move(
      slowGoBoundaryBox.x + slowGoBoundaryBox.width / 2,
      slowGoBoundaryBox.y + slowGoBoundaryBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      slowGoBoundaryBox.x + slowGoBoundaryBox.width / 2 - 60,
      slowGoBoundaryBox.y + slowGoBoundaryBox.height / 2
    );
    await expect
      .poll(() => targetPath.getAttribute("d"))
      .not.toBe(targetPathBeforeBoundaryDrag);
    await expect
      .poll(async () => {
        const stored = await readLocalStorageItem(
          page,
          "cs-pension-modeller.settings"
        );
        return stored
          ? (
              JSON.parse(stored) as {
                data: { spendingSmile: { slowGoStartAge: number } };
              }
            ).data.spendingSmile.slowGoStartAge
          : null;
      })
      .toBe(76);
    await page.mouse.up();
    await expect
      .poll(async () => {
        const stored = await readLocalStorageItem(
          page,
          "cs-pension-modeller.settings"
        );
        return stored
          ? (
              JSON.parse(stored) as {
                data: { spendingSmile: { slowGoStartAge: number } };
              }
            ).data.spendingSmile.slowGoStartAge
          : null;
      })
      .not.toBe(76);

    const slowGoResultHandle = page.getByRole("slider", {
      name: "Slow-go spending percentage",
    });
    await expect(
      page.getByRole("slider", {
        name: "Go-go spending percentage",
      })
    ).toHaveAttribute("aria-valuenow", "100");
    await expect(slowGoResultHandle).toHaveAttribute("aria-valuenow", "80");
    await expect(
      page.getByRole("slider", {
        name: "No-go spending percentage",
      })
    ).toHaveAttribute("aria-valuenow", "70");
    await slowGoResultHandle.scrollIntoViewIfNeeded();
    const slowGoHandlePoint = await slowGoResultHandle.evaluate((path) => {
      const svgPath = path as SVGPathElement;
      const pathPoint = svgPath.getPointAtLength(svgPath.getTotalLength() / 2);
      const screenMatrix = svgPath.getScreenCTM();

      if (!screenMatrix) {
        throw new Error("Expected the SMILE chart handle to be rendered");
      }

      const screenPoint = pathPoint.matrixTransform(screenMatrix);

      return { x: screenPoint.x, y: screenPoint.y };
    });
    await expect
      .poll(() =>
        page.evaluate(
          ({ x, y }) =>
            (document.elementFromPoint(x, y) as SVGPathElement | null)?.dataset
              .testid ?? null,
          slowGoHandlePoint
        )
      )
      .toBe("spending-smile-slowGo-target-handle");
    const initialSlowGoPath = await slowGoResultHandle.getAttribute("d");
    await page.mouse.move(slowGoHandlePoint.x, slowGoHandlePoint.y);
    await page.mouse.down();
    await page.mouse.move(slowGoHandlePoint.x, slowGoHandlePoint.y + 20);
    await expect
      .poll(() => slowGoResultHandle.getAttribute("d"))
      .not.toBe(initialSlowGoPath);
    const releasedSlowGoPath = await slowGoResultHandle.getAttribute("d");
    await slowGoResultHandle.evaluate((path) => {
      const svgPath = path as SVGPathElement;
      svgPath.dataset.dragPathHistory = JSON.stringify([
        svgPath.getAttribute("d"),
      ]);
      new MutationObserver((records) => {
        const history = JSON.parse(
          svgPath.dataset.dragPathHistory ?? "[]"
        ) as Array<string | null>;

        for (const record of records) {
          history.push(record.oldValue, svgPath.getAttribute("d"));
        }

        svgPath.dataset.dragPathHistory = JSON.stringify(history);
      }).observe(svgPath, {
        attributeFilter: ["d"],
        attributeOldValue: true,
        attributes: true,
      });
    });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const stored = await readLocalStorageItem(
          page,
          "cs-pension-modeller.settings"
        );
        return stored
          ? (
              JSON.parse(stored) as {
                data: { spendingSmile: { slowGoPercentage: number } };
              }
            ).data.spendingSmile.slowGoPercentage
          : null;
      })
      .not.toBe(80);
    await slowGoResultHandle.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    const dragPathHistory = await slowGoResultHandle.evaluate(
      (path) =>
        JSON.parse(
          (path as SVGPathElement).dataset.dragPathHistory ?? "[]"
        ) as Array<string | null>
    );
    expect(dragPathHistory).not.toContain(initialSlowGoPath);
    await expect(slowGoResultHandle).toHaveAttribute(
      "d",
      releasedSlowGoPath ?? ""
    );
  });

  test("shows income-target funding priority only in the expert target step", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await page.locator('[data-step-id="expert-sipp"]:visible').click();
    await expect(
      page.getByRole("region", { name: "Income-target funding priority" })
    ).toHaveCount(0);

    await page
      .locator('[data-step-id="expert-retirement-target"]:visible')
      .click();
    await page
      .getByRole("combobox", { name: "Spending strategy" })
      .selectOption("SPENDING_SMILE");
    const priorityEditor = page.getByRole("region", {
      name: "Income-target funding priority",
    });
    const otherStrategies = priorityEditor.getByRole("region", {
      name: "Other withdrawal strategies",
    });
    await expect(otherStrategies).toContainText("SIPP");
    await expect(otherStrategies).toContainText("ISA");
    await expect(priorityEditor.locator("[data-priority-account]")).toHaveCount(
      0
    );
    const sippStrategy = priorityEditor.getByRole("combobox", {
      name: "SIPP withdrawal strategy",
    });
    const isaStrategy = priorityEditor.getByRole("combobox", {
      name: "ISA withdrawal strategy",
    });
    await expect(sippStrategy).toHaveValue("use_by_age");
    await expect(isaStrategy).toHaveValue("use_by_age");
    await sippStrategy.selectOption("meet_income_target");
    await isaStrategy.selectOption("meet_income_target");
    const isaHandle = priorityEditor.getByRole("button", {
      name: "Reorder ISA. Priority 2 of 2.",
    });
    const sippRow = priorityEditor.locator('[data-priority-account="sipp"]');
    await isaHandle.scrollIntoViewIfNeeded();
    const isaHandleBox = await requiredBox(isaHandle);
    const sippRowBox = await requiredBox(sippRow);
    await page.mouse.move(
      isaHandleBox.x + isaHandleBox.width / 2,
      isaHandleBox.y + isaHandleBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      sippRowBox.x + sippRowBox.width / 2,
      sippRowBox.y + 2,
      { steps: 5 }
    );
    await page.mouse.up();
    await expect(
      priorityEditor.locator("li").first().getByText("ISA")
    ).toBeVisible();
    await priorityEditor
      .getByRole("combobox", { name: "SIPP withdrawal strategy" })
      .selectOption("use_by_age");
    await expect(
      priorityEditor.locator('[data-priority-account="sipp"]')
    ).toHaveCount(0);
    await expect(
      priorityEditor.locator('[data-priority-account="isa"]')
    ).toHaveCount(1);
    await expect(
      otherStrategies.locator('[data-other-account="sipp"]')
    ).toBeVisible();
  });

  test("keeps accounts visible when flat-target strategies move below the priority", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");
    await page
      .locator('[data-step-id="expert-retirement-target"]:visible')
      .click();

    const priorityEditor = page.getByRole("region", {
      name: "Income-target funding priority",
    });
    await priorityEditor
      .getByRole("combobox", { name: "SIPP withdrawal strategy" })
      .selectOption("meet_income_target");
    await priorityEditor
      .getByRole("combobox", { name: "ISA withdrawal strategy" })
      .selectOption("meet_income_target");

    await priorityEditor
      .getByRole("combobox", { name: "SIPP withdrawal strategy" })
      .selectOption("use_by_age");
    await expect(
      priorityEditor.locator('[data-priority-account="isa"]')
    ).toBeVisible();
    await expect(
      priorityEditor.locator('[data-other-account="sipp"]')
    ).toBeVisible();

    await priorityEditor
      .getByRole("combobox", { name: "ISA withdrawal strategy" })
      .selectOption("percentage");
    await expect(priorityEditor).toBeVisible();
    await expect(priorityEditor.locator("[data-priority-account]")).toHaveCount(
      0
    );
    await expect(priorityEditor.locator("[data-other-account]")).toHaveCount(2);
  });
});

async function assertRetirementTargetGrid(
  page: Page,
  retirementAgeControl: Locator,
  targetControl: Locator,
  strategyControl: Locator
) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("The Playwright viewport is unavailable");
  }

  const captureGrid = targetControl.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' field-grid ')][1]"
  );
  const columnCount = await captureGrid.evaluate(
    (element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
        .length
  );
  const boxes = await Promise.all([
    requiredBox(getFieldCard(targetControl)),
    requiredBox(getFieldCard(retirementAgeControl)),
    requiredBox(getFieldCard(strategyControl)),
    requiredBox(getPhaseCard(page, "Go-go years")),
    requiredBox(getPhaseCard(page, "Slow-go years")),
    requiredBox(getPhaseCard(page, "No-go years")),
    requiredBox(page.locator(".spending-smile-configuration")),
  ]);

  expect(columnCount).toBe(viewport.width >= 860 ? 2 : 1);

  if (viewport.width >= 860) {
    assertDesktopRetirementTargetGrid(boxes);
  } else {
    const yPositions = boxes.map((box) => box.y);
    expect(yPositions).toEqual(
      [...yPositions].sort((left, right) => left - right)
    );
  }
}

function assertDesktopRetirementTargetGrid([
  target,
  retirementAge,
  strategy,
  goGo,
  slowGo,
  noGo,
  profile,
]: Awaited<ReturnType<typeof requiredBox>>[]) {
  expect(Math.abs(retirementAge.width - target.width)).toBeLessThanOrEqual(3);
  expect(Math.abs(retirementAge.y - target.y)).toBeLessThanOrEqual(3);
  expect(retirementAge.x).toBeGreaterThan(target.x);
  expect(Math.abs(strategy.width - target.width)).toBeLessThanOrEqual(3);
  expect(strategy.y).toBeGreaterThan(target.y);
  expect(Math.abs(strategy.x - target.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(strategy.y - goGo.y)).toBeLessThanOrEqual(3);
  expect(goGo.x).toBeGreaterThan(strategy.x);
  expect(slowGo.y).toBeGreaterThan(goGo.y);
  expect(Math.abs(slowGo.x - target.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(slowGo.y - noGo.y)).toBeLessThanOrEqual(3);
  expect(noGo.x).toBeGreaterThan(slowGo.x);
  expect(profile.y).toBeGreaterThan(noGo.y);
  expect(Math.abs(profile.x - target.x)).toBeLessThanOrEqual(3);
}

function getFieldCard(control: Locator) {
  return control.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' field-card ')][1]"
  );
}

function getPhaseCard(page: Page, heading: string) {
  return page
    .getByRole("heading", { name: heading })
    .locator(
      "xpath=ancestor::section[contains(concat(' ', normalize-space(@class), ' '), ' field-card ')][1]"
    );
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Expected a layout box for ${locator.toString()}`);
  }
  return box;
}

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

async function clickNextAndExpectStep(page: Page, heading: string) {
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: heading })
  ).toBeVisible();
}

async function navigateToJourneyResult(page: Page) {
  for (let index = 0; index < 20; index += 1) {
    const resultHeading = page.getByRole("heading", {
      level: 3,
      name: "Your results",
    });

    if (await resultHeading.isVisible().catch(() => false)) {
      return;
    }

    const next = page.getByRole("button", {
      name: /^(Next|Show my answer)$/,
    });
    await next.click();
  }

  throw new Error("Expert result step was not reached");
}

async function countDistinctPathYValues(targetPath: Locator) {
  return targetPath.evaluate((element) => {
    const path = element.getAttribute("d") ?? "";
    const coordinatePairs = Array.from(
      path.matchAll(/(?:M|L)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)
    );
    const verticalCoordinates = Array.from(
      path.matchAll(/V(-?\d+(?:\.\d+)?)/g)
    );

    return new Set([
      ...coordinatePairs.map((match) => match[2]),
      ...verticalCoordinates.map((match) => match[1]),
    ]).size;
  });
}

async function addAdditionalIncome(
  page: Page,
  name: string,
  annualIncome: string,
  startAge: string
) {
  await page.getByRole("button", { name: "Add additional income" }).click();
  await page.getByLabel("Name, optional").fill(name);
  await page
    .getByRole("spinbutton", { name: "Annual income" })
    .fill(annualIncome);
  await page.getByRole("spinbutton", { name: "Starts at age" }).fill(startAge);
}

async function expectProjectionTableForViewport(
  page: Page,
  projectName: string
) {
  const projectionTableHeading = page.getByRole("heading", {
    name: "Monthly pension projection table",
  });

  if (projectName.startsWith("mobile")) {
    await expect(projectionTableHeading).toHaveCount(0);
    return;
  }

  await expect(projectionTableHeading).toBeVisible();
}

async function assertFooterPage(
  page: Page,
  pageName:
    "About" | "Acceptance criteria" | "Methodology" | "Privacy" | "Settings",
  sectionHeading: string
) {
  const pathSegment =
    pageName === "Acceptance criteria" ? "acceptance" : pageName.toLowerCase();
  const path = `/${pathSegment}/`;
  const link = page
    .getByRole("contentinfo")
    .getByRole("link", { name: pageName });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(link).toHaveAttribute("href", new RegExp(`${pathSegment}/$`));
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
      name: "Clear all data",
    });

    await expect(exportButton).toBeVisible();
    await expect(resetButton).toBeVisible();
    await expect(page.getByLabel("Choose JSON parameter file")).toBeVisible();
    await expect(page.getByLabel("Save inputs on this device")).toBeChecked();
    await expect(page.getByLabel("Show guidance notes")).toBeChecked();

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^cs-pension-parameters-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/
    );
    await expect(page.getByRole("status")).toHaveText("Parameters exported");

    await resetButton.click();
    await expect(page.getByRole("status")).toHaveText("Data Cleared");

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
    await expect(page.getByRole("status")).toHaveText("Parameters loaded");
    await expect(page.getByLabel("Choose JSON parameter file")).toHaveValue("");
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"desiredRetirementIncome":45678');

    await page.getByLabel("Save inputs on this device").uncheck();
    await expect(
      page.getByLabel("Save inputs on this device")
    ).not.toBeChecked();
    await expect(page.getByRole("status")).toHaveText(
      "Local saving turned off"
    );
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toBeNull();

    await page.getByLabel("Save inputs on this device").check();
    await expect(page.getByLabel("Save inputs on this device")).toBeChecked();
    await expect(page.getByRole("status")).toHaveText("Local saving turned on");

    const guidanceToggle = page.getByLabel("Show guidance notes");
    await guidanceToggle.uncheck();
    await expect(guidanceToggle).not.toBeChecked();
    await expect(page.getByRole("status")).toHaveText("Settings saved");
    await expect
      .poll(() =>
        readLocalStorageItem(page, "cs-pension-modeller.guidanceNotes")
      )
      .toBe("false");

    await guidanceToggle.check();
    await expect(guidanceToggle).toBeChecked();
    await expect(page.getByRole("status")).toHaveText("Settings saved");
    await expect
      .poll(() =>
        readLocalStorageItem(page, "cs-pension-modeller.guidanceNotes")
      )
      .toBe("true");
  }

  if (pageName === "Privacy") {
    await expect(
      page.getByRole("link", { name: "Settings page" })
    ).toHaveAttribute("href", /settings\/$/);
  }
}

async function readLocalStorageItem(page: Page, key: string) {
  try {
    return await page.evaluate((storageKey) => {
      return window.localStorage.getItem(storageKey);
    }, key);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Execution context was destroyed")
    ) {
      return "__navigation_in_progress__";
    }

    throw error;
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
