import { Given, Then, When } from "@cucumber/cucumber";
import {
  createQuickCalculatorBaseSettings,
  runQuickCalculatorScenarios,
  type QuickCalculatorBaseSettingsResult,
  type QuickCalculatorBatchResult,
} from "../../src/calculation/quick-calculator-scenarios";
import { addYearsToIsoDate } from "../../src/model-date";
import {
  projectQuickCalculatorResults,
  QUICK_CALCULATOR_RESULT_BASIS,
} from "../../src/result-projection/quick-calculator-results";
import {
  createDefaultSettings,
  loadStoredSettingsByJourney,
  saveLocalStoragePreference,
  type PensionSettings,
} from "../../src/settings";
import {
  clearStoredQuickCalculatorState,
  loadQuickCalculatorState,
  saveQuickCalculatorState,
  type QuickCalculatorCompletion,
  type QuickCalculatorStoredInputs,
} from "../../src/app/quick-calculator/quick-calculator-storage";
import {
  getQuickCalculatorIncompleteMessage,
  getQuickCalculatorReadiness,
} from "../../src/app/quick-calculator/quick-calculator-readiness";
import {
  createQuickCalculatorDefaults,
  FRESH_QUICK_CALCULATOR_COMPLETION,
  getQuickCalculatorAgeDefaults,
} from "../../src/app/quick-calculator/quick-calculator-defaults";
import { loadStoredComparisonScenarios } from "../../src/app/comparison-storage";

const CALCULATION_DATE = "2026-09-22";
const COMPLETE: QuickCalculatorCompletion = {
  dateOfBirth: true,
  accruedPensionAtLastAbs: true,
  pensionableEarnings: true,
  retirementAgeInitialised: true,
  partialRetirementAgeInitialised: true,
};

type QuickWorld = {
  quickInputs?: PensionSettings;
  quickCompletion?: QuickCalculatorCompletion;
  quickBatch?: QuickCalculatorBatchResult;
  baseResult?: QuickCalculatorBaseSettingsResult;
  readiness?: ReturnType<typeof getQuickCalculatorReadiness>;
  fullPlansSnapshot?: string;
  comparisonsSnapshot?: string;
  oldQuickAccrued?: number;
  reloadedQuickAccrued?: number;
  reloadedQuickStatePension?: number;
  canonicalAddedPensionRatio?: number;
  calculationDate?: string;
  quickAgeDefaults?: ReturnType<typeof getQuickCalculatorAgeDefaults>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validQuickInputs(): PensionSettings {
  return {
    ...createDefaultSettings(),
    dateOfBirth: "1987-06-01",
    alphaPensionAbsDate: "2025",
    accruedPensionAtLastAbs: 5_000,
    pensionableEarnings: 42_000,
    alphaPensionDrawAge: 60,
    alphaAddedPensionMonthly: 100,
    partialRetirementStartAge: 55,
    partialRetirementWorkPercent: 50,
  };
}

function toStoredInputs(
  settings: PensionSettings
): QuickCalculatorStoredInputs {
  return {
    dateOfBirth: settings.dateOfBirth,
    alphaPensionAbsDate: settings.alphaPensionAbsDate,
    accruedPensionAtLastAbs: settings.accruedPensionAtLastAbs,
    pensionableEarnings: settings.pensionableEarnings,
    alphaPensionDrawAge: settings.alphaPensionDrawAge,
    alphaHasProtectedPensionAge: settings.alphaHasProtectedPensionAge,
    alphaAddedPensionMonthly: settings.alphaAddedPensionMonthly,
    alphaAddedPensionFactorType: settings.alphaAddedPensionFactorType,
    partialRetirementStartAge: settings.partialRetirementStartAge,
    partialRetirementWorkPercent: settings.partialRetirementWorkPercent,
    showStatePension: settings.showStatePension,
    currentStatePension: settings.currentStatePension,
    statePensionForecastConfirmed: settings.statePensionForecastConfirmed,
    alphaEpaEnabled: settings.alphaEpaEnabled,
    alphaEpaPeriods: settings.alphaEpaPeriods.map((period) => ({ ...period })),
  };
}

function calculateQuick(world: QuickWorld, calculationDate = CALCULATION_DATE) {
  assert(world.quickInputs, "Quick inputs were not prepared");
  const built = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs: world.quickInputs,
    calculationDate,
  });
  world.baseResult = built;
  assert(built.status === "ready", "Quick inputs were not valid");
  world.quickBatch = runQuickCalculatorScenarios({
    baseSettings: built.settings,
    calculationDate,
  });
}

Given(
  "a fresh quick calculator on 24 September 2026",
  function (this: QuickWorld) {
    this.calculationDate = "2026-09-24";
    this.quickInputs = createQuickCalculatorDefaults(createDefaultSettings());
    this.quickCompletion = { ...FRESH_QUICK_CALCULATOR_COMPLETION };
  }
);

Then("its birth date is unanswered", function (this: QuickWorld) {
  assert(this.quickInputs, "Quick inputs were not prepared");
  assert(
    this.quickInputs.dateOfBirth === "" &&
      this.quickCompletion?.dateOfBirth === false,
    "Fresh birth date should remain unanswered"
  );
});

Then(
  "its starting Alpha pension is {int} pounds and earnings are {int} pounds",
  function (this: QuickWorld, pension: number, earnings: number) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    assert(
      this.quickInputs.accruedPensionAtLastAbs === pension &&
        this.quickInputs.pensionableEarnings === earnings &&
        this.quickCompletion?.accruedPensionAtLastAbs === true &&
        this.quickCompletion.pensionableEarnings === true,
      "Fresh financial assumptions were not usable"
    );
  }
);

Then(
  "its starting selected age is {int} and reduced-hours age is {int}",
  function (this: QuickWorld, selectedAge: number, reducedHoursAge: number) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    assert(
      this.quickInputs.alphaPensionDrawAge === selectedAge &&
        this.quickInputs.partialRetirementStartAge === reducedHoursAge &&
        this.quickCompletion?.retirementAgeInitialised === false &&
        this.quickCompletion.partialRetirementAgeInitialised === false,
      "Fresh quick ages or their initialisation flags were incorrect"
    );
  }
);

When(
  "the member enters a birth date of 1 June 1960",
  function (this: QuickWorld) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    this.quickInputs.dateOfBirth = "1960-06-01";
    this.quickAgeDefaults = getQuickCalculatorAgeDefaults(
      this.quickInputs.dateOfBirth,
      this.calculationDate ?? CALCULATION_DATE
    );
  }
);

Then(
  "untouched quick ages both move to {float}",
  function (this: QuickWorld, expectedAge: number) {
    assert(this.quickAgeDefaults?.supported, "Expected supported age defaults");
    assert(
      this.quickAgeDefaults.retirementAge === expectedAge &&
        this.quickAgeDefaults.reducedHoursAge === expectedAge,
      "Quick ages did not use the next future quarter age"
    );
  }
);

Given(
  "valid Alpha statement and earnings inputs in the quick calculator",
  function (this: QuickWorld) {
    this.quickInputs = validQuickInputs();
    this.quickCompletion = { ...COMPLETE };
  }
);

When(
  "the member selects a supported retirement age before normal pension age",
  function (this: QuickWorld) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    this.quickInputs.alphaPensionDrawAge = 60;
    calculateQuick(this);
  }
);

Then(
  "estimates are available for both retirement ages",
  function (this: QuickWorld) {
    assert(this.quickBatch, "Quick estimates were not calculated");
    const projected = projectQuickCalculatorResults(this.quickBatch);
    for (const basis of ["normal", "selected"] as const) {
      assert(
        projected.cards.some(
          (card) => card.basis === basis && card.status === "available"
        ),
        `Expected an available ${basis}-age estimate`
      );
    }
  }
);

Then(
  "each age has standard, added-pension, reduced-hours and combined variants",
  function (this: QuickWorld) {
    assert(this.quickBatch, "Quick estimates were not calculated");
    for (const basis of ["normal", "selected"] as const) {
      const variants = this.quickBatch.scenarios
        .filter((scenario) => scenario.basis === basis)
        .map((scenario) => scenario.variant);
      assert(
        JSON.stringify(variants) ===
          JSON.stringify(["standard", "added", "reduced", "reduced-added"]),
        `Unexpected ${basis} variants`
      );
    }
  }
);

Then(
  "the amounts are labelled annual, before tax and in today's money",
  function () {
    assert(
      QUICK_CALCULATOR_RESULT_BASIS.period === "annual" &&
        QUICK_CALCULATOR_RESULT_BASIS.tax === "before tax" &&
        QUICK_CALCULATOR_RESULT_BASIS.value === "today's money" &&
        QUICK_CALCULATOR_RESULT_BASIS.label.includes(
          "annual income before tax, in today's money"
        ),
      "Quick result presentation basis was not explicit"
    );
  }
);

When(
  "quick-calculator inputs are saved and the quick calculator storage is reset",
  function (this: QuickWorld) {
    this.fullPlansSnapshot = JSON.stringify(
      loadStoredSettingsByJourney().settings
    );
    this.comparisonsSnapshot = JSON.stringify(loadStoredComparisonScenarios());
    const quickInputs = validQuickInputs();
    quickInputs.pensionableEarnings = 99_000;
    assert(
      saveQuickCalculatorState({
        inputs: toStoredInputs(quickInputs),
        completion: COMPLETE,
      }),
      "Expected quick inputs to save"
    );
    assert(
      clearStoredQuickCalculatorState(),
      "Expected quick storage to reset"
    );
    assert(
      loadQuickCalculatorState().status === "empty",
      "Quick storage remained populated"
    );
  }
);

Then(
  "all populated full-modeller plans and saved comparisons retain their original values",
  function (this: QuickWorld) {
    assert(
      JSON.stringify(loadStoredSettingsByJourney().settings) ===
        this.fullPlansSnapshot,
      "Full plans changed"
    );
    assert(
      JSON.stringify(loadStoredComparisonScenarios()) ===
        this.comparisonsSnapshot,
      "Saved comparisons changed"
    );
  }
);

Given(
  "monthly Added Pension payments of {int} pounds",
  function (this: QuickWorld, payment: number) {
    this.quickInputs = validQuickInputs();
    this.quickInputs.alphaAddedPensionMonthly = payment;
  }
);

Given(
  "working hours reduce to {int} percent before retirement",
  function (this: QuickWorld, percent: number) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    this.quickInputs.partialRetirementStartAge = 55;
    this.quickInputs.partialRetirementWorkPercent = percent;
  }
);

When(
  "the combined quick-calculator variant is calculated",
  function (this: QuickWorld) {
    calculateQuick(this);
    const full = this.quickBatch?.scenarios.find(
      (scenario) => scenario.id === "selected-added"
    )?.result;
    const reduced = this.quickBatch?.scenarios.find(
      (scenario) => scenario.id === "selected-reduced-added"
    )?.result;
    const reductionDate = addYearsToIsoDate("1987-06-01", 55);
    const reducedRow = reduced?.rows.find(
      (row) => row.date >= reductionDate && row.monthlyAddedPension > 0
    );
    const fullRow = full?.rows.find((row) => row.date === reducedRow?.date);
    assert(
      reducedRow && fullRow && fullRow.monthlyAddedPension > 0,
      "Expected canonical Added Pension accrual rows"
    );
    this.canonicalAddedPensionRatio =
      reducedRow.monthlyAddedPension / fullRow.monthlyAddedPension;
  }
);

Then(
  "its regular Added Pension payment after that date is {int} pounds",
  function (this: QuickWorld, expected: number) {
    const scenario = this.quickBatch?.scenarios.find(
      (candidate) => candidate.id === "selected-reduced-added"
    );
    assert(scenario, "Combined scenario missing");
    assert(
      (scenario.settings.alphaAddedPensionMonthly *
        scenario.settings.partialRetirementWorkPercent) /
        100 ===
        expected,
      "Effective configured payment did not match"
    );
    assert(
      Math.abs((this.canonicalAddedPensionRatio ?? 0) - 0.5) < 1e-9,
      "Canonical Added Pension accrual did not apply reduced hours"
    );
  }
);

Then(
  "the result explains that reduced payment assumption",
  function (this: QuickWorld) {
    const scenario = this.quickBatch?.scenarios.find(
      (candidate) => candidate.id === "selected-reduced-added"
    );
    assert(
      scenario?.notes.some((note) => note.includes("becomes £100 at 50%")),
      "Reduced Added Pension note missing"
    );
  }
);

Given(
  "quick Added Pension inputs whose supported purchase window has ended",
  function (this: QuickWorld) {
    this.quickInputs = {
      ...validQuickInputs(),
      dateOfBirth: "1957-06-01",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 70,
      alphaAddedPensionMonthly: 200,
      alphaAddedPensionFactorType: "self",
      partialRetirementStartAge: 70,
      alphaEpaEnabled: false,
    };
  }
);

When(
  "the quick comparisons are calculated on 23 September 2026",
  function (this: QuickWorld) {
    calculateQuick(this, "2026-09-23");
  }
);

Then(
  "the selected Added Pension estimate retains the canonical amount",
  function (this: QuickWorld) {
    const standard = this.quickBatch?.scenarios.find(
      (scenario) => scenario.id === "selected-standard"
    );
    const added = this.quickBatch?.scenarios.find(
      (scenario) => scenario.id === "selected-added"
    );
    assert(standard?.result && added?.result, "Selected estimates unavailable");
    assert(
      added.result.summary.alphaPension.annualAtDraw ===
        standard.result.summary.alphaPension.annualAtDraw,
      "Canonical Added Pension amount changed despite unsupported purchases"
    );
  }
);

Then(
  "the selected Added Pension estimate explains the model coverage limitation",
  function (this: QuickWorld) {
    const added = this.quickBatch?.scenarios.find(
      (scenario) => scenario.id === "selected-added"
    );
    assert(
      added?.notes.some(
        (note) =>
          note.includes("excludes all regular Added Pension payments") &&
          note.includes("model limitation")
      ),
      "Added Pension model coverage qualification missing"
    );
  }
);

Given(
  "Alpha starts before the member's State Pension date",
  function (this: QuickWorld) {
    this.quickInputs = validQuickInputs();
    this.quickInputs.alphaPensionDrawAge = 60;
  }
);

When("the quick estimates are displayed", function (this: QuickWorld) {
  calculateQuick(this);
});

Then(
  "the Alpha-only amount is distinguished from the later combined amount",
  function (this: QuickWorld) {
    assert(this.quickBatch, "Quick estimates were not calculated");
    const card = projectQuickCalculatorResults(this.quickBatch).cards.find(
      (candidate) => candidate.id === "selected-standard"
    );
    assert(
      card?.alphaAnnual !== null &&
        card?.combinedAnnual !== null &&
        card?.combinedStartDate !== card?.alphaDrawDate,
      "Alpha and later combined amounts were not distinct"
    );
  }
);

Then(
  "the combined amount states its actual start date",
  function (this: QuickWorld) {
    assert(this.quickBatch, "Quick estimates were not calculated");
    const card = projectQuickCalculatorResults(this.quickBatch).cards.find(
      (candidate) => candidate.id === "selected-standard"
    );
    const scenario = this.quickBatch.scenarios.find(
      (candidate) => candidate.id === "selected-standard"
    );
    assert(
      card?.combinedStartDate === scenario?.settings.statePensionDrawDate,
      "Combined amount did not use the actual State Pension start date"
    );
  }
);

Given(
  "quick inputs for a member born on 1 May 1977",
  function (this: QuickWorld) {
    this.quickInputs = {
      ...validQuickInputs(),
      dateOfBirth: "1977-05-01",
    };
  }
);

When(
  "the quick comparisons are calculated with the derived State Pension date",
  function (this: QuickWorld) {
    calculateQuick(this);
  }
);

Then(
  "the quick base uses the exact State Pension date 2044-05-06",
  function (this: QuickWorld) {
    assert(
      this.baseResult?.status === "ready" &&
        this.baseResult.settings.statePensionDrawDate === "2044-05-06",
      "Quick base did not retain the exact derived State Pension date"
    );
  }
);

Then(
  "all quick scenarios retain the exact State Pension date 2044-05-06",
  function (this: QuickWorld) {
    assert(
      this.quickBatch?.scenarios.every(
        (scenario) =>
          scenario.settings.statePensionDrawDate === "2044-05-06" &&
          scenario.result?.settings.statePensionDrawDate === "2044-05-06"
      ),
      "A quick scenario changed the exact derived State Pension date"
    );
  }
);

Given("an unanswered accrued pension field", function (this: QuickWorld) {
  this.quickInputs = validQuickInputs();
  this.quickCompletion = {
    ...COMPLETE,
    accruedPensionAtLastAbs: false,
  };
  this.readiness = getQuickCalculatorReadiness({
    inputs: this.quickInputs,
    completion: this.quickCompletion,
    draftErrors: {
      accruedPensionAtLastAbs: "Enter Alpha pension on your statement.",
    },
    dirtyDrafts: { accruedPensionAtLastAbs: true },
  });
});

Then(
  "no current pension estimate is presented as complete",
  function (this: QuickWorld) {
    assert(
      this.readiness?.calculationEnabled === false,
      "Production readiness should block calculation"
    );
  }
);

Then(
  "the quick results ask for a valid annual Alpha pension",
  function (this: QuickWorld) {
    assert(this.quickCompletion, "Quick completion was not prepared");
    assert(
      getQuickCalculatorIncompleteMessage(this.quickCompletion) ===
        "Enter a valid annual Alpha pension from your statement to see estimates.",
      "Results did not identify the unanswered Alpha pension"
    );
  }
);

Given(
  "an unfinished State Pension amount in the quick calculator",
  function (this: QuickWorld) {
    assert(
      this.quickInputs && this.quickCompletion,
      "Quick inputs were not prepared"
    );
    this.readiness = getQuickCalculatorReadiness({
      inputs: { ...this.quickInputs, showStatePension: false },
      completion: this.quickCompletion,
      draftErrors: {
        currentStatePension: "Enter a valid State Pension forecast.",
      },
      dirtyDrafts: { currentStatePension: true },
    });
  }
);

When(
  "State Pension is excluded and the valid quick inputs are saved",
  function (this: QuickWorld) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    this.quickInputs.showStatePension = false;
    assert(
      saveQuickCalculatorState({
        inputs: toStoredInputs(this.quickInputs),
        completion: COMPLETE,
      }),
      "Valid quick inputs with State Pension excluded were not saved"
    );
    const reloaded = loadQuickCalculatorState();
    assert(reloaded.status === "loaded", "Saved quick inputs did not reload");
    this.reloadedQuickStatePension = reloaded.state.inputs.currentStatePension;
    this.quickInputs = { ...createDefaultSettings(), ...reloaded.state.inputs };
  }
);

Then(
  "the quick calculator can estimate without State Pension",
  function (this: QuickWorld) {
    assert(
      this.readiness?.calculationEnabled,
      "Inactive draft blocked calculation"
    );
    calculateQuick(this);
    assert(
      this.quickBatch?.scenarios.every(
        (scenario) => scenario.settings.showStatePension === false
      ),
      "State Pension remained in a quick scenario"
    );
  }
);

Then(
  "the saved quick inputs reload with State Pension excluded",
  function (this: QuickWorld) {
    assert(
      this.quickInputs?.showStatePension === false,
      "Saved State Pension exclusion was lost"
    );
  }
);

Then(
  "the unfinished State Pension amount was not saved",
  function (this: QuickWorld) {
    assert(
      this.reloadedQuickStatePension ===
        createDefaultSettings().currentStatePension,
      "The unfinished State Pension draft replaced the valid saved amount"
    );
  }
);

When(
  "the member explicitly enters zero and completes the remaining inputs",
  function (this: QuickWorld) {
    assert(this.quickInputs, "Quick inputs were not prepared");
    this.quickInputs.accruedPensionAtLastAbs = 0;
    this.quickCompletion = { ...COMPLETE };
    this.readiness = getQuickCalculatorReadiness({
      inputs: this.quickInputs,
      completion: this.quickCompletion,
      draftErrors: {},
      dirtyDrafts: {},
    });
    assert(this.readiness.calculationEnabled, "Explicit zero should be ready");
    calculateQuick(this);
  }
);

Then(
  "the zero accrued amount is used in the canonical calculation",
  function (this: QuickWorld) {
    assert(
      this.quickBatch?.scenarios.every(
        (scenario) => scenario.settings.accruedPensionAtLastAbs === 0
      ),
      "Explicit zero was not preserved"
    );
  }
);

Given(
  "retained quick results have been calculated from the stored quick inputs",
  function (this: QuickWorld) {
    const stored = loadQuickCalculatorState();
    assert(stored.status === "loaded", "Expected populated quick storage");
    this.oldQuickAccrued = stored.state.inputs.accruedPensionAtLastAbs;
    this.quickInputs = {
      ...createDefaultSettings(),
      ...stored.state.inputs,
    };
    calculateQuick(this);
    assert(this.quickBatch, "Expected a retained quick batch");
    assert(
      this.quickBatch.scenarios.some((scenario) => scenario.result),
      "Expected retained quick results"
    );
  }
);

When(
  "saving is enabled and a valid post-clear quick snapshot is persisted",
  function (this: QuickWorld) {
    assert(
      loadQuickCalculatorState().status === "empty",
      "Global clear should remove quick storage"
    );
    saveLocalStoragePreference(true);
    const edited = validQuickInputs();
    edited.accruedPensionAtLastAbs = 321;
    assert(
      saveQuickCalculatorState({
        inputs: toStoredInputs(edited),
        completion: COMPLETE,
      }),
      "Post-clear quick edit was not saved"
    );
    const reloaded = loadQuickCalculatorState();
    assert(
      reloaded.status === "loaded",
      "Post-clear quick edit did not reload"
    );
    this.reloadedQuickAccrued = reloaded.state.inputs.accruedPensionAtLastAbs;
    this.quickInputs = { ...createDefaultSettings(), ...reloaded.state.inputs };
    calculateQuick(this);
  }
);

Then("cleared values and results do not return", function (this: QuickWorld) {
  assert(this.reloadedQuickAccrued === 321, "Post-reset edit was not retained");
  assert(
    this.oldQuickAccrued !== this.reloadedQuickAccrued,
    "Cleared quick value returned"
  );
  assert(
    this.quickBatch?.scenarios.every(
      (scenario) => scenario.settings.accruedPensionAtLastAbs === 321
    ),
    "A result was calculated from cleared quick data"
  );
});

Given(
  "valid quick inputs with an enabled EPA purchase period",
  function (this: QuickWorld) {
    this.quickInputs = validQuickInputs();
    this.quickInputs.alphaEpaEnabled = true;
    this.quickInputs.alphaEpaPeriods = [
      {
        id: "quick-epa",
        yearsBeforeNpa: 1,
        startDate: "2030-04-01",
        endDate: "2031-03-31",
      },
    ];
  }
);

When("the EPA period start date is cleared", function (this: QuickWorld) {
  assert(this.quickInputs, "Quick inputs were not prepared");
  this.quickInputs.alphaEpaPeriods[0].startDate = "";
  this.baseResult = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs: this.quickInputs,
    calculationDate: CALCULATION_DATE,
  });
});

Then(
  "the raw EPA schedule is rejected with an actionable period error",
  function (this: QuickWorld) {
    assert(this.baseResult?.status === "invalid", "Raw EPA input was accepted");
    assert(
      this.baseResult.validationIssues.some(
        (issue) =>
          issue.itemId === "quick-epa" && issue.message.includes("start date")
      ),
      "Actionable EPA period issue missing"
    );
  }
);

Then(
  "no repaired quick-calculator estimate is produced",
  function (this: QuickWorld) {
    assert(
      this.baseResult?.status === "invalid" &&
        this.baseResult.settings === null &&
        !this.quickBatch,
      "Invalid EPA input produced a repaired estimate"
    );
  }
);

When("EPA is disabled and then re-enabled", function (this: QuickWorld) {
  assert(this.quickInputs, "Quick inputs were not prepared");
  this.quickInputs.alphaEpaEnabled = false;
  const disabled = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs: this.quickInputs,
    calculationDate: CALCULATION_DATE,
  });
  assert(disabled.status === "ready", "Disabled EPA draft should not block");
  this.quickInputs.alphaEpaEnabled = true;
  this.baseResult = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs: this.quickInputs,
    calculationDate: CALCULATION_DATE,
  });
});

Then("the raw EPA schedule error is restored", function (this: QuickWorld) {
  assert(
    this.baseResult?.status === "invalid" &&
      this.baseResult.validationIssues.some((issue) =>
        issue.message.includes("start date")
      ),
    "Re-enabled EPA did not restore its raw error"
  );
});

Given(
  "quick inputs for a member born in June 1959 with selected retirement at age 68",
  function (this: QuickWorld) {
    this.quickInputs = {
      ...validQuickInputs(),
      dateOfBirth: "1959-06-01",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 68,
    };
  }
);

When(
  "the quick comparisons are calculated on 22 September 2026",
  function (this: QuickWorld) {
    calculateQuick(this, CALCULATION_DATE);
  }
);

Then(
  "normal-age variants are unavailable as past retirement",
  function (this: QuickWorld) {
    assert(
      this.quickBatch?.scenarios
        .filter((scenario) => scenario.basis === "normal")
        .every(
          (scenario) =>
            scenario.result === null &&
            scenario.validationIssues.some((issue) =>
              issue.message.includes("cannot reconstruct retirement")
            )
        ),
      "Past normal-age variants were not unavailable"
    );
  }
);

Then("selected-age variants remain available", function (this: QuickWorld) {
  assert(
    this.quickBatch?.scenarios
      .filter((scenario) => scenario.basis === "selected")
      .every((scenario) => scenario.result),
    "Future selected-age variants were not available"
  );
});
