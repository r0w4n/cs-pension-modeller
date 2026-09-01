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
      page.getByRole("heading", { name: "A little about you" })
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
      page.getByRole("heading", { name: "Your personal details" })
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
      page.getByRole("heading", {
        name: "Retirement income target",
      })
    ).toBeVisible();
    await fillExactNumber(page, "Target retirement age exact value", "60");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current SIPP pot (£)", "125000");
    await page.getByRole("button", { name: "Next" }).click();
    await fillCurrency(page, "Current ISA pot (£)", "40000");
    await clickNextAndExpectStep(page, "Tax assumptions");
    await expect(page.getByLabel("SIPP withdrawal tax treatment")).toHaveCount(
      0
    );
    const calculationWorkerStarted = page.waitForEvent("worker");
    await page.getByRole("button", { name: "Show my answer" }).click();
    await calculationWorkerStarted;
    await expect(
      page.getByRole("heading", { name: "Retirement income over time" })
    ).toBeVisible();
    await expect(page.getByTestId("retirement-income-age-axis")).toContainText(
      "Age"
    );
    await expect(
      page.getByTestId("retirement-income-you-age-axis")
    ).toHaveCount(0);
    await renderDeferredComparisonContent(page);
    await expectProjectionBasisBelowResultsChart(page);

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

  test("completes the simple journey without the comparison section", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "simple");

    await clickNextAndExpectStep(
      page,
      "What would you like to spend each month?"
    );
    await expect(
      page.getByRole("link", { name: /Help me choose a retirement income/i })
    ).toHaveAttribute("href", "https://www.retirementlivingstandards.org.uk/");
    await fillCurrency(
      page,
      "How much would you like available to spend each month after tax?",
      "2000"
    );
    await clickNextAndExpectStep(page, "What age would you like to retire?");
    await fillExactNumber(
      page,
      "How old would you like to be when you retire? exact value",
      "68"
    );
    await clickNextAndExpectStep(page, "Add your Alpha pension details");

    await expect(
      page.getByRole("link", {
        name: /Help me find my Annual Benefit Statement/i,
      })
    ).toBeVisible();
    await fillCurrency(
      page,
      "Yearly Alpha pension built up so far (£)",
      "17500"
    );
    await clickNextAndExpectStep(
      page,
      "Do you know your State Pension forecast?"
    );
    await expect(
      page.getByRole("radio", {
        name: "No — use £12,548 a year for now",
      })
    ).toBeChecked();
    await expect(
      page.getByRole("heading", { name: "What we'll use for now" })
    ).toBeVisible();
    await expect(page.getByText(/We'll use £12,548 a year/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Check my State Pension forecast/i })
    ).toHaveAttribute("href", "https://www.gov.uk/check-state-pension");
    await page.getByRole("radio", { name: "Yes, enter my forecast" }).click();
    await fillCurrency(
      page,
      "How much State Pension does your forecast show each year?",
      "12547.6"
    );
    await clickNextAndExpectStep(
      page,
      "Do you have any other Civil Service pensions?"
    );
    await expect(
      page.getByText(/Alpha is always included in this simplified journey/i)
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Alpha" })).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "classic pension" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Civil Service AVC savings" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Show my answer" }).click();
    await expect(
      page.getByRole("heading", {
        name: "How your retirement income may change",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show chart as monthly" })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("Amount you want to spend", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Money left after estimated tax", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(/Estimated shortfall/i)).toHaveCount(0);
    await expect(page.getByText(/spending target/i)).toHaveCount(0);
    await expect(page.getByLabel("Target income line")).toHaveCount(0);
    await expect(page.getByLabel("Added Alpha pension")).toHaveCount(0);
    await expect(
      page.getByText("What to check", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("How this estimate was worked out", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByRole("region", { name: "Comparison results" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your estimated retirement income" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Save this result as a scenario" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Saved scenarios" })
    ).toHaveCount(0);
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

  test("expert two-person targets use aligned household controls and two-person quick-selects", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await page
      .getByRole("checkbox", { name: "Model retirement for two people" })
      .check();
    await page
      .getByRole("button", { name: "Retirement income target" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Household retirement income target" })
    ).toBeVisible();
    await expect(
      page.getByRole("slider", { name: "Your retirement age" })
    ).toHaveClass("range-input");
    await expect(
      page.getByRole("slider", {
        name: "Your gross annual employment income before retirement",
      })
    ).toHaveClass("range-input");
    await expect(
      page.getByRole("slider", {
        name: "Partner gross annual employment income before retirement",
      })
    ).toHaveClass("range-input");
    await expect(
      page.getByRole("spinbutton", {
        name: "Partner gross annual employment income before retirement exact value",
      })
    ).toHaveValue("42000");
    await expect(
      page.getByLabel("Household target once you are both retired")
    ).toHaveClass("number-input");
    await expect(
      page.getByRole("button", { name: "Minimum £22,500" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Moderate £45,400" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Comfortable £62,700" })
    ).toBeVisible();
    const householdFundingPriority = page.getByRole("region", {
      name: "Income-target funding priority",
    });
    await expect(householdFundingPriority).toBeVisible();
    await expect(
      householdFundingPriority.getByRole("region", {
        name: "Other withdrawal strategies",
      })
    ).toBeVisible();
    const partnerIsaStrategy = householdFundingPriority.getByRole("combobox", {
      name: "Partner ISA withdrawal strategy",
    });
    await expect(partnerIsaStrategy).toHaveValue("use_by_age");
    await partnerIsaStrategy.selectOption("meet_income_target");
    await expect(
      householdFundingPriority.locator('[data-priority-account="partner:isa"]')
    ).toBeVisible();
  });

  test("expert two-person results use one editable household chart and monthly table", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await page
      .getByRole("checkbox", { name: "Model retirement for two people" })
      .check();
    await page.getByRole("checkbox", { name: "LISA", exact: true }).check();
    await page.getByRole("checkbox", { name: "Partner LISA" }).check();
    await navigateToJourneyResult(page);

    await expect(
      page.getByRole("heading", { name: "Household retirement income summary" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Retirement income summary display" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Income at different periods" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plan status" })
    ).toBeVisible();
    const householdChart = page.getByRole("region", {
      name: "Household Retirement Plan",
    });
    await expect(householdChart).toBeVisible();
    await expect(
      householdChart.getByText("Calendar month/year", { exact: true })
    ).toHaveCount(0);
    await expect(
      householdChart.getByTestId("retirement-income-you-age-axis")
    ).toContainText("You");
    await expect(
      householdChart.getByTestId("retirement-income-partner-age-axis")
    ).toContainText("Partner");
    await expect(
      page.getByText("Your State Pension", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Partner State Pension", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("slider", { name: "Target income line" })
    ).toHaveCount(1);
    await expect(
      page.getByRole("slider", { name: "You: Retire" })
    ).toBeVisible();
    await expect(
      page.getByRole("slider", { name: "Partner: Retire" })
    ).toBeVisible();
    const yourRetirementMarker = householdChart.getByRole("slider", {
      name: "You: Retire",
    });
    const yourRetirementMarkerBox = await yourRetirementMarker
      .locator(".retirement-income-milestone-handle")
      .boundingBox();
    expect(yourRetirementMarkerBox).not.toBeNull();
    const yourRetirementPointer = {
      button: 0,
      clientX: yourRetirementMarkerBox!.x + yourRetirementMarkerBox!.width / 2,
      clientY: yourRetirementMarkerBox!.y + yourRetirementMarkerBox!.height / 2,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    };
    await yourRetirementMarker.dispatchEvent(
      "pointerdown",
      yourRetirementPointer
    );
    const yourDragAge = householdChart.locator(
      '.retirement-income-drag-age[data-owner="you"]'
    );
    await expect(yourDragAge).toBeVisible();
    await expect(yourDragAge).toContainText(/\d/);
    await yourRetirementMarker.dispatchEvent("pointerup", {
      ...yourRetirementPointer,
      buttons: 0,
    });
    await expect(
      householdChart.getByRole("group", {
        name: "Household chart contribution controls",
      })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", { name: "Your ISA contribution" })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", { name: "Your SIPP contribution" })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", { name: "Your LISA contribution" })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", { name: "Partner ISA contribution" })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", {
        name: "Partner SIPP contribution",
      })
    ).toBeVisible();
    await expect(
      householdChart.getByRole("slider", {
        name: "Partner LISA contribution",
      })
    ).toBeVisible();
    const householdControlLayout = await householdChart.evaluate((chart) => {
      const getCardTop = (label: string) =>
        chart
          .querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
          ?.closest(".retirement-income-control-card")
          ?.getBoundingClientRect().top;
      return {
        viewportWidth: window.innerWidth,
        yourControlTops: [
          getCardTop("Your Added Alpha pension"),
          getCardTop("Your ISA contribution"),
          getCardTop("Your LISA contribution"),
          getCardTop("Your SIPP contribution"),
        ],
        partnerControlTop: getCardTop("Partner ISA contribution"),
      };
    });
    if (householdControlLayout.viewportWidth >= 1100) {
      const yourControlTops = householdControlLayout.yourControlTops.filter(
        (value): value is number => value !== undefined
      );
      expect(
        Math.max(...yourControlTops) - Math.min(...yourControlTops)
      ).toBeLessThan(2);
      expect(householdControlLayout.partnerControlTop).toBeGreaterThan(
        Math.max(...yourControlTops)
      );
    }
    const milestoneLabelFits = await householdChart
      .locator(".retirement-income-milestone-handle-label")
      .evaluateAll((labels) =>
        labels.every((label) => {
          const textWidth = (label as SVGTextElement).getBBox().width;
          const handle = label.parentElement?.querySelector(
            ".retirement-income-milestone-handle"
          );
          const handleHeight = Number(handle?.getAttribute("height") ?? 0);
          return textWidth <= handleHeight - 4;
        })
      );
    expect(milestoneLabelFits).toBe(true);
    const partnerRetirementMarker = page.getByRole("slider", {
      name: "Partner: Retire",
    });
    await partnerRetirementMarker.focus();
    await expect
      .poll(() =>
        partnerRetirementMarker.evaluate(
          (marker) => getComputedStyle(marker).outlineStyle
        )
      )
      .toBe("none");
    await expect(
      page.getByRole("group", { name: "Joint results chart view" })
    ).toHaveCount(0);
    const periodInspector = page.getByTestId(
      "retirement-income-period-inspector"
    );
    await expect(periodInspector).toBeVisible();
    await periodInspector.focus();
    const periodDetails = page.getByTestId("retirement-income-period-details");
    await expect(periodDetails).toBeVisible();
    await expect(
      periodDetails.getByRole("heading", { name: "Events" })
    ).toBeVisible();
    await expect(
      periodDetails
        .getByRole("listitem")
        .filter({ hasText: /You retire|Partner retires/ })
        .first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Monthly household income projection table",
      })
    ).toBeVisible();

    await renderDeferredComparisonContent(page);
    const comparisonResults = page.getByRole("region", {
      name: "Comparison results",
    });
    await expect(
      comparisonResults.getByText("Target income", { exact: true })
    ).toBeVisible();
    await expect(
      comparisonResults.getByText("Both retired", { exact: true })
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await page.getByLabel("Scenario name").fill("Household plan");
    await page.getByRole("button", { name: "Add to comparison" }).click();
    const savedHousehold = page.locator(".comparison-card").filter({
      has: page.locator('input[value="Household plan"]'),
    });
    await expect(
      savedHousehold.getByText("Two-person household")
    ).toBeVisible();
    await savedHousehold
      .getByRole("button", { name: "Load this scenario" })
      .click();
    await expect(
      page.getByRole("checkbox", { name: "Model retirement for two people" })
    ).toBeChecked();
    await navigateToJourneyResult(page);
    await expect(
      page.getByRole("region", { name: "Household Retirement Plan" })
    ).toBeVisible();
    await expect(
      page.getByTestId("retirement-income-partner-age-axis")
    ).toContainText("Partner");
  });

  test("expert retirement age defaults follow Normal Pension Age", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await clickNextAndExpectStep(page, "Personal details");
    await page.getByLabel("Your Birth Month and Year month").selectOption("06");
    await page
      .getByLabel("Your Birth Month and Year year")
      .selectOption("1977");

    await clickNextAndExpectStep(page, "Retirement income target");
    const targetRetirementAge = page.getByLabel(
      "Target retirement age exact value"
    );
    await expect(targetRetirementAge).toHaveValue("67.25");

    await page.getByRole("button", { name: /State pension details/i }).click();
    await expect(
      page.getByLabel("State Pension start age exact value")
    ).toHaveValue("67.25");

    await page.getByRole("button", { name: /Alpha pension details/i }).click();
    await expect(
      page.getByLabel("Age You Leave Alpha Scheme exact value")
    ).toHaveValue("67.25");
    await expect(
      page.getByLabel("Planned Alpha Pension Draw Age exact value")
    ).toHaveValue("67.25");

    await page.getByRole("button", { name: /SIPP details/i }).click();
    const sippDrawStartAge = page.getByLabel("SIPP draw start age exact value");
    await expect(sippDrawStartAge).toHaveValue("67.25");

    await sippDrawStartAge.fill("65");
    await sippDrawStartAge.blur();
    await page
      .getByRole("button", {
        name: "Reset SIPP draw start age to default value",
      })
      .click();
    await expect(sippDrawStartAge).toHaveValue("67.25");
  });

  test("expert mode persists the Scottish Income Tax regime and shows its relevant assumptions", async ({
    page,
  }) => {
    await acknowledgeAndOpenMode(page, "expert");

    await expect(page.getByRole("checkbox", { name: "Taxation" })).toHaveCount(
      0
    );
    await page.getByRole("button", { name: /SIPP details/i }).click();
    const sippWithdrawalTaxTreatment = page.getByRole("combobox", {
      name: "SIPP withdrawal tax treatment",
    });
    await expect(sippWithdrawalTaxTreatment).toHaveValue("ufpls");
    await expect(
      page.getByRole("slider", {
        name: "SIPP tax-free withdrawal share (%)",
      })
    ).toHaveCount(0);
    await sippWithdrawalTaxTreatment.selectOption("custom");
    await expect(
      page.getByRole("slider", {
        name: "SIPP tax-free withdrawal share (%)",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Check the lump-sum allowance" })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/tax-on-your-private-pension/lump-sum-allowance"
    );
    await page.getByRole("button", { name: /Tax assumptions/i }).click();

    const taxRegime = page.getByRole("combobox", {
      name: "Income Tax regime",
    });
    await expect(taxRegime).toHaveValue("rest_of_uk");
    await expect(
      page.getByText(
        /groups modelled taxable income into April-to-March years/i
      )
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "SIPP withdrawal tax treatment",
      })
    ).toHaveCount(0);
    await taxRegime.selectOption("scotland");

    await expect(taxRegime).toHaveValue("scotland");
    await expect(
      page.getByRole("spinbutton", {
        name: "Personal Allowance (£ per year)",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("spinbutton", {
        name: "Basic-rate taxable band (£ per year)",
      })
    ).toHaveCount(0);
    await expect
      .poll(() => readLocalStorageItem(page, "cs-pension-modeller.settings"))
      .toContain('"taxRegime":"scotland"');

    await page.getByRole("button", { name: /Alpha pension details/i }).click();
    await fillCurrency(
      page,
      "Alpha Pension Accrued at Last Statement (£ per year)",
      "40000"
    );
    await page.getByRole("button", { name: /Your results/i }).click();
    await renderDeferredComparisonContent(page);

    const chartKey = page.getByLabel("Chart key");
    await expect(chartKey.getByText("Estimated Income Tax")).toBeVisible();
    await expect(chartKey.getByText("Shortfall")).toBeVisible();
    await expect(
      chartKey.getByText("Civil Service AVC", { exact: true })
    ).toHaveCount(0);
    await expect(chartKey.getByText("LISA", { exact: true })).toHaveCount(0);
    await expect(
      chartKey.locator(".retirement-income-income-tax-key")
    ).toBeVisible();
  });

  test("completes the bridge journey", async ({ page }, testInfo) => {
    test.slow();

    await acknowledgeAndOpenMode(page, "bridge");

    await clickNextAndExpectStep(
      page,
      "What would you like to spend each month?"
    );
    await fillCurrency(
      page,
      "How much would you like available to spend each month after tax?",
      "2833.33"
    );
    await expect(
      page.getByRole("heading", { name: "Not sure what amount to choose?" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Help me choose a retirement income/i })
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Spending strategy" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Income-target funding priority" })
    ).toHaveCount(0);

    await clickNextAndExpectStep(page, "What age would you like to retire?");
    const retirementAgeInput = page.getByRole("spinbutton", {
      name: "How old would you like to be when you retire? exact value",
    });
    await expect(retirementAgeInput).toHaveAttribute("step", "0.25");
    await retirementAgeInput.fill("58.2");
    await retirementAgeInput.press("Enter");
    await expect(
      page.getByText(
        "Enter a whole year, or add 3, 6 or 9 months (for example 67.25)."
      )
    ).toBeVisible();
    await fillExactNumber(
      page,
      "How old would you like to be when you retire? exact value",
      "58.25"
    );
    await expect(
      page.getByText("Selected age: 58 years 3 months")
    ).toBeVisible();
    await clickNextAndExpectStep(page, "Your Civil Service pensions");
    await expect(
      page.getByRole("checkbox", { name: "Civil Service AVC" })
    ).toHaveCount(0);
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

    await clickNextAndExpectStep(page, "Your bridging money");

    await expect(
      page.getByRole("checkbox", { name: "ISA", exact: true })
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Lifetime ISA (LISA)" })
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "SIPP or personal pension" })
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Civil Service AVC" })
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Other guaranteed income" })
    ).not.toBeChecked();
    await page
      .getByRole("checkbox", { name: "Other guaranteed income" })
      .check();
    await page.getByRole("checkbox", { name: "Lifetime ISA (LISA)" }).uncheck();
    await expect(
      page.locator('.journey-step-button[data-step-id="lisa"]')
    ).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Lifetime ISA (LISA)" }).check();
    await clickNextAndExpectStep(
      page,
      "How should your bridging money be used?"
    );
    await expect(
      page.getByRole("combobox", { name: "Spending strategy" })
    ).toHaveValue("FLAT");
    await expect(
      page.getByRole("region", { name: "Income-target funding priority" })
    ).toBeVisible();
    await page
      .getByRole("combobox", {
        name: "ISA withdrawal strategy",
        exact: true,
      })
      .selectOption("meet_income_target");

    await clickNextAndExpectStep(page, "Additional guaranteed income");
    await addAdditionalIncome(
      page,
      "Previous employer DB pension",
      "5000",
      "60"
    );
    await clickNextAndExpectStep(page, "Your ISA");

    await fillCurrency(page, "Current ISA balance (£)", "35000");
    await clickNextAndExpectStep(page, "Your Lifetime ISA");
    await fillCurrency(page, "Current LISA balance (£)", "12000");
    await expect(
      page.getByRole("button", { name: "Add LISA lump sum" })
    ).toBeVisible();
    const lisaContributionSlider = page.getByRole("slider", {
      name: "Planned monthly LISA contribution before age 50",
    });
    await lisaContributionSlider.press("End");
    await expect(lisaContributionSlider).toHaveValue("333.33");
    await expect(
      page.getByRole("spinbutton", {
        name: "Planned monthly LISA contribution before age 50 exact value",
      })
    ).toHaveValue("333.33");
    await fillExactNumber(page, "LISA access age exact value", "60");
    await clickNextAndExpectStep(page, "Your SIPP or personal pension");
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
    await clickNextAndExpectStep(page, "Your pension pot tax assumptions");
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await clickNextAndExpectStep(page, "Check your plan");
    await expect(
      page.getByText("£35,000 current balance; Use to meet income target")
    ).toBeVisible();
    await expect(
      page.getByText("Previous employer DB pension", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Calculate my plan" }).click();
    await expect(
      page.getByRole("heading", { name: "Retirement income over time" })
    ).toBeVisible();
    await renderDeferredComparisonContent(page);
    await expectProjectionBasisBelowResultsChart(page);

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

    const retirementMarker = page.getByRole("slider", {
      name: "Retire, age 58 years 3 months",
    });
    await retirementMarker.scrollIntoViewIfNeeded();
    const retirementMarkerBox = await retirementMarker.boundingBox();
    expect(retirementMarkerBox).not.toBeNull();
    await page.mouse.move(
      retirementMarkerBox!.x + retirementMarkerBox!.width / 2,
      retirementMarkerBox!.y + retirementMarkerBox!.height / 2
    );
    await page.mouse.down();

    const dragAgeLabel = page.locator(".retirement-income-drag-age");
    await expect(dragAgeLabel).toContainText("58y 3m");
    const dragAgeLabelBounds = await dragAgeLabel.evaluate((label) => {
      const background = label.querySelector("rect")?.getBBox();
      const text = label.querySelector("text")?.getBBox();

      return {
        backgroundWidth: background?.width ?? 0,
        textWidth: text?.width ?? Number.POSITIVE_INFINITY,
      };
    });
    expect(dragAgeLabelBounds.backgroundWidth).toBe(58);
    expect(dragAgeLabelBounds.textWidth).toBeLessThan(
      dragAgeLabelBounds.backgroundWidth
    );
    await page.mouse.up();

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
        name: "After-tax income target",
      })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Retirement income target",
      })
    ).toBeVisible();
    await expect(page.locator(".journey-progress")).toHaveText("Step 3 of 10");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: "Personal details" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Retirement income target",
      })
    ).toBeVisible();
    const retirementAgeControl = page.getByRole("slider", {
      name: "Target retirement age",
    });
    await expect(retirementAgeControl).toHaveValue("68");

    await expect(
      page.getByText(
        "How much would you like to have available to spend each year in retirement, after tax?"
      )
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", {
        name: "What does your retirement income target mean?",
      })
    ).toHaveCount(0);
    for (const amount of [
      "£11,250",
      "£13,900",
      "£22,700",
      "£31,350",
      "£32,700",
      "£45,400",
    ]) {
      await expect(page.getByRole("button", { name: amount })).toBeVisible();
    }
    await page.getByRole("button", { name: "£45,400" }).click();

    await fillCurrency(page, "After-tax income target", "45400");

    const targetControl = page.getByRole("spinbutton", {
      name: "After-tax income target",
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

    const targetPath = page.locator(".retirement-income-target-line").first();
    await expect(targetPath).toHaveAttribute("d", /.+/);
    expect(await countDistinctPathYValues(targetPath)).toBeGreaterThanOrEqual(
      3
    );

    const slowGoBoundaryHandle = page.getByTestId(
      "retirement-income-marker-slowGoStartAge"
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
        return readJourneySettingsValue(
          stored,
          "expert",
          (settings) => settings.spendingSmile?.slowGoStartAge
        );
      })
      .toBe(76);
    await page.mouse.up();
    await expect
      .poll(async () => {
        const stored = await readLocalStorageItem(
          page,
          "cs-pension-modeller.settings"
        );
        return readJourneySettingsValue(
          stored,
          "expert",
          (settings) => settings.spendingSmile?.slowGoStartAge
        );
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
    const slowGoHandlePoint = await findExposedSvgPathPoint(slowGoResultHandle);
    const initialSlowGoPath = await slowGoResultHandle.getAttribute("d");
    await page.mouse.move(slowGoHandlePoint.x, slowGoHandlePoint.y);
    await page.mouse.down();
    await page.mouse.move(slowGoHandlePoint.x, slowGoHandlePoint.y + 20);
    await expect
      .poll(() => slowGoResultHandle.getAttribute("d"))
      .not.toBe(initialSlowGoPath);
    const releasedSlowGoPath = await slowGoResultHandle.getAttribute("d");
    const initialSlowGoYValues = getDistinctPathYValues(initialSlowGoPath);
    const releasedSlowGoYValues = getDistinctPathYValues(releasedSlowGoPath);
    expect(releasedSlowGoYValues).not.toEqual(initialSlowGoYValues);
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
    const calculationStatus = page.getByText("Updating calculated results…", {
      exact: true,
    });
    await expect(calculationStatus).toBeVisible();
    await expect
      .poll(async () => {
        const stored = await readLocalStorageItem(
          page,
          "cs-pension-modeller.settings"
        );
        return readJourneySettingsValue(
          stored,
          "expert",
          (settings) => settings.spendingSmile?.slowGoPercentage
        );
      })
      .not.toBe(80);
    const storedSettings = await readLocalStorageItem(
      page,
      "cs-pension-modeller.settings"
    );
    const committedSlowGoPercentage = readJourneySettingsValue(
      storedSettings,
      "expert",
      (settings) => settings.spendingSmile?.slowGoPercentage
    );
    await expect(slowGoResultHandle).toHaveAttribute(
      "aria-valuenow",
      String(committedSlowGoPercentage)
    );
    await expect(calculationStatus).toHaveCount(0);
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
    expect(
      dragPathHistory.some((path) =>
        getDistinctPathYValues(path).some((value) =>
          initialSlowGoYValues.includes(value)
        )
      )
    ).toBe(false);
    expect(
      getDistinctPathYValues(await slowGoResultHandle.getAttribute("d"))
    ).not.toEqual(initialSlowGoYValues);
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

async function findExposedSvgPathPoint(locator: Locator) {
  return locator.evaluate((path) => {
    const svgPath = path as SVGPathElement;
    const screenMatrix = svgPath.getScreenCTM();

    if (!screenMatrix) {
      throw new Error("Expected the SVG path to be rendered");
    }

    const totalLength = svgPath.getTotalLength();
    const sampleFractions = [
      0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.05, 0.95,
    ];

    for (const fraction of sampleFractions) {
      const pathPoint = svgPath.getPointAtLength(totalLength * fraction);
      const screenPoint = pathPoint.matrixTransform(screenMatrix);

      if (document.elementFromPoint(screenPoint.x, screenPoint.y) === svgPath) {
        return { x: screenPoint.x, y: screenPoint.y };
      }
    }

    throw new Error("Expected an exposed point on the SVG path");
  });
}

async function startFirstRun(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

function readJourneySettingsValue<T>(
  stored: string | null,
  journey: "simple" | "bridge" | "expert",
  select: (settings: {
    spendingSmile?: {
      slowGoStartAge?: number;
      slowGoPercentage?: number;
    };
  }) => T | undefined
) {
  if (!stored) {
    return null;
  }

  const parsed = JSON.parse(stored) as {
    data?: {
      journeys?: Partial<
        Record<
          "simple" | "bridge" | "expert",
          {
            spendingSmile?: {
              slowGoStartAge?: number;
              slowGoPercentage?: number;
            };
          }
        >
      >;
    };
  };

  return select(parsed.data?.journeys?.[journey] ?? {}) ?? null;
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
      page.getByRole("heading", { name: "A little about you" })
    ).toBeVisible();
    return;
  }

  if (mode === "bridge") {
    await page
      .getByRole("button", { name: /Work out what I need to retire early/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your personal details" })
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
      name: /^(Next|Show my answer|Calculate my plan)$/,
    });
    await next.click();
  }

  throw new Error("Expert result step was not reached");
}

async function countDistinctPathYValues(targetPath: Locator) {
  return getDistinctPathYValues(await targetPath.getAttribute("d")).length;
}

function getDistinctPathYValues(path: string | null) {
  const coordinatePairs = Array.from(
    (path ?? "").matchAll(/(?:M|L)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)
  );
  const verticalCoordinates = Array.from(
    (path ?? "").matchAll(/V(-?\d+(?:\.\d+)?)/g)
  );

  return Array.from(
    new Set([
      ...coordinatePairs.map((match) => match[2] ?? ""),
      ...verticalCoordinates.map((match) => match[1] ?? ""),
    ])
  );
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
  const comparisonRegion = page.getByRole("region", {
    name: "Comparison results",
  });

  await comparisonRegion
    .getByRole("heading", { name: "Comparison", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    comparisonRegion.getByRole("heading", {
      name: "Save this result as a scenario",
    })
  ).toBeVisible();

  await page.evaluate(async () => {
    const steps = [0.5, 0.9, 1.4, 2.2];

    for (const multiplier of steps) {
      window.scrollBy(0, window.innerHeight * multiplier);
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  });
}

async function expectProjectionBasisBelowResultsChart(page: Page) {
  const chartComesFirst = await page.evaluate(() => {
    const chart = document.querySelector(".retirement-income-chart-panel");
    const projectionBasis = document.querySelector(".inflation-panel");

    return Boolean(
      chart &&
      projectionBasis &&
      chart.compareDocumentPosition(projectionBasis) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  expect(chartComesFirst).toBe(true);
}
