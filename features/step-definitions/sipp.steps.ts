import { Given, Then, When } from "@cucumber/cucumber";
import { fieldGroups } from "../../src/fieldDefinitions";
import {
  getEffectiveRangeField,
  JOURNEY_DEFINITIONS,
  type JourneyStepDefinition,
  shouldRenderField,
} from "../../src/app-domains";
import {
  createProjectionTable,
  type ProjectionRow,
} from "../../src/projection";
import {
  createDefaultSettings,
  loadStoredSettings,
  saveLocalStoragePreference,
  saveSettings,
  validateSettings,
  type PensionSettings,
} from "../../src/settings";

type SippWorld = {
  settings?: PensionSettings;
  loadedSettings?: PensionSettings;
};

type MemoryStorage = Storage & {
  snapshot: () => Record<string, string>;
};

function assertCondition(
  condition: unknown,
  message = "Expected condition to be true"
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>();
  const localStorage: MemoryStorage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values.entries());
    },
  };

  return localStorage;
}

function installLocalStorage() {
  const localStorage = createMemoryStorage();
  const testGlobal = globalThis as typeof globalThis & {
    window?: { localStorage: Storage };
  };

  Object.defineProperty(testGlobal, "window", {
    configurable: true,
    value: { localStorage },
  });

  return localStorage;
}

function getSettings(world: SippWorld) {
  if (!world.settings) {
    world.settings = createSippScenarioSettings("1980-08-01");
  }

  return world.settings;
}

function updateSettings(world: SippWorld, updates: Partial<PensionSettings>) {
  world.settings = {
    ...getSettings(world),
    ...updates,
  };
}

function createSippScenarioSettings(dateOfBirth: string): PensionSettings {
  return {
    ...createDefaultSettings(),
    dateOfBirth,
    startDate: "2026-04-01",
    lifeExpectancy: 90,
    requirementAge: 60,
    showAlpha: false,
    showSipp: true,
    sippCurrentPot: 120_000,
    sippMonthlyContribution: 0,
    sippWithdrawalStrategy: "percentage",
    sippWithdrawalPercent: 12,
    sippTaxReliefRate: "none",
  };
}

function getSippDrawAgeIssue(settings: PensionSettings) {
  return validateSettings(settings).find(
    (issue) => issue.field === "sippDrawAge"
  );
}

function getSippRangeField(fieldId: "sippDrawAge") {
  const field = fieldGroups
    .find((group) => group.id === "sipp")
    ?.fields.find((candidate) => candidate.id === fieldId);

  assertCondition(field?.type === "range", `Expected ${fieldId} range field`);

  return field;
}

function getFirstSippWithdrawalRow(rows: ProjectionRow[]) {
  return rows.find((row) => row.monthlySippPension > 0);
}

function isFieldsStep(
  step: JourneyStepDefinition
): step is JourneyStepDefinition & { kind: "fields" } {
  return step.kind === "fields";
}

Given(
  "a SIPP modelling scenario for someone born on {string}",
  function (this: SippWorld, dateOfBirth: string) {
    this.settings = createSippScenarioSettings(dateOfBirth);
  }
);

Given(
  "provider-confirmed SIPP protected pension age is off",
  function (this: SippWorld) {
    updateSettings(this, {
      sippHasProtectedPensionAge: false,
    });
  }
);

Given(
  "provider-confirmed SIPP protected pension age is {int}",
  function (this: SippWorld, protectedAge: number) {
    updateSettings(this, {
      sippHasProtectedPensionAge: true,
      sippProtectedPensionAge: protectedAge,
    });
  }
);

Given(
  "provider-confirmed SIPP protected access is on",
  function (this: SippWorld) {
    updateSettings(this, {
      sippHasProtectedPensionAge: true,
      sippProtectedPensionAge: 50,
    });
  }
);

Given(
  "stored SIPP protected pension age is {int} while provider confirmation is off",
  function (this: SippWorld, protectedAge: number) {
    updateSettings(this, {
      sippHasProtectedPensionAge: false,
      sippProtectedPensionAge: protectedAge,
    });
  }
);

When(
  "the SIPP draw start age is {int}",
  function (this: SippWorld, drawAge: number) {
    updateSettings(this, {
      sippDrawAge: drawAge,
    });
  }
);

When("the SIPP settings are saved and loaded", function (this: SippWorld) {
  installLocalStorage();
  saveLocalStoragePreference(true);
  saveSettings(getSettings(this));
  this.loadedSettings = loadStoredSettings();
});

Then("SIPP draw start age validation should pass", function (this: SippWorld) {
  assertEqual(getSippDrawAgeIssue(getSettings(this)), undefined);
});

Then(
  "the SIPP draw start age validation message should be {string}",
  function (this: SippWorld, expectedMessage: string) {
    const issue = getSippDrawAgeIssue(getSettings(this));

    assertCondition(issue, "Expected a SIPP draw age validation issue");
    assertEqual(issue.message, expectedMessage);
  }
);

Then(
  "the SIPP projection should start withdrawals at age {int}",
  function (this: SippWorld, expectedAge: number) {
    const settings = getSettings(this);
    const rows = createProjectionTable(settings);
    const firstWithdrawalRow = getFirstSippWithdrawalRow(rows);

    assertCondition(firstWithdrawalRow, "Expected SIPP withdrawals to start");
    assertEqual(firstWithdrawalRow.age, expectedAge);
  }
);

Then(
  "the protected pension age standalone form field should be hidden",
  function (this: SippWorld) {
    assertEqual(
      shouldRenderField("sippHasProtectedPensionAge", getSettings(this)),
      false
    );
  }
);

Then(
  "the SIPP draw start age section should contain protected SIPP controls",
  function (this: SippWorld) {
    const sippFields =
      fieldGroups.find((group) => group.id === "sipp")?.fields ?? [];
    const sippDrawAgeIndex = sippFields.findIndex(
      (field) => field.id === "sippDrawAge"
    );
    const protectedCheckboxIndex = sippFields.findIndex(
      (field) => field.id === "sippHasProtectedPensionAge"
    );

    assertEqual(shouldRenderField("sippDrawAge", getSettings(this)), true);
    assertEqual(
      shouldRenderField("sippHasProtectedPensionAge", getSettings(this)),
      false
    );
    assertEqual(protectedCheckboxIndex, sippDrawAgeIndex + 1);
  }
);

Then(
  "the SIPP draw start age field minimum should be {int}",
  function (this: SippWorld, expectedMinimum: number) {
    const field = getSippRangeField("sippDrawAge");
    const effectiveField = getEffectiveRangeField(field, getSettings(this));

    assertEqual(effectiveField.min, expectedMinimum);
  }
);

Then(
  "the loaded SIPP settings should have provider-confirmed protected pension age on",
  function (this: SippWorld) {
    assertCondition(this.loadedSettings, "Expected loaded settings");
    assertEqual(this.loadedSettings.sippHasProtectedPensionAge, true);
  }
);

Then(
  "every journey that exposes SIPP draw start age should keep protected SIPP controls after it",
  function () {
    const missingJourneyIds = JOURNEY_DEFINITIONS.flatMap((journey) =>
      journey.steps
        .filter(isFieldsStep)
        .filter((step) =>
          (step.fieldIds as readonly string[]).includes("sippDrawAge")
        )
        .filter((step) => {
          const fieldIds = step.fieldIds as readonly string[];
          const sippDrawAgeIndex = fieldIds.indexOf("sippDrawAge");

          return (
            fieldIds.indexOf("sippHasProtectedPensionAge") !==
            sippDrawAgeIndex + 1
          );
        })
        .map((step) => `${journey.id}:${step.id}`)
    );

    assertEqual(missingJourneyIds.length, 0);
  }
);
