import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDate,
  createDefaultSettings,
  isModelAge,
  normalizeSetting,
  type PensionSettings,
} from "../../src/settings";
import { updateSetting } from "../../src/app/chart-state";
import { migrateSettingsToLatest } from "../../src/settings/settings-migrations";
import type { StoredSettingsEnvelope } from "../../src/settings/settings-versions";

const numericAgeSettingKeys = {
  "target retirement age": "requirementAge",
  "life expectancy": "lifeExpectancy",
  "Alpha pension draw age": "alphaPensionDrawAge",
  "SIPP withdrawal target age": "sippWithdrawalTargetAge",
} as const satisfies Record<string, keyof PensionSettings>;

type QuarterYearAgeWorld = {
  modelledAge?: number;
  manualAgeIsValid?: boolean;
  storedEnvelope?: StoredSettingsEnvelope<unknown>;
  migratedData?: unknown;
  normalPensionAge?: number;
  statePensionDate?: string;
  expertSettings?: PensionSettings;
};

When(
  "the {string} numeric age is entered as {float}",
  function (
    this: QuarterYearAgeWorld,
    settingName: keyof typeof numericAgeSettingKeys,
    enteredAge: number
  ) {
    const key = numericAgeSettingKeys[settingName];

    assertCondition(key, `Unknown numeric age setting: ${settingName}`);
    this.modelledAge = normalizeSetting(key, enteredAge);
  }
);

Then(
  "the model should use age {float}",
  function (this: QuarterYearAgeWorld, expectedAge: number) {
    assertEqual(this.modelledAge, expectedAge);
  }
);

When(
  "the manual numeric age {float} is checked",
  function (this: QuarterYearAgeWorld, enteredAge: number) {
    this.manualAgeIsValid = isModelAge(enteredAge);
  }
);

Then(
  "the manual age should be {word}",
  function (this: QuarterYearAgeWorld, validity: string) {
    assertEqual(this.manualAgeIsValid, validity === "accepted");
  }
);

Given(
  "a version 14 saved plan contains unrounded top-level and nested ages",
  function (this: QuarterYearAgeWorld) {
    this.storedEnvelope = {
      version: 14,
      data: {
        journeys: {
          simple: {
            requirementAge: 67.16666666666667,
            lifeExpectancy: 89.9,
            spendingSmile: {
              slowGoStartAge: 74.9,
              noGoStartAge: 84.6,
            },
            additionalGuaranteedIncomes: [
              {
                id: "income-1",
                startAge: 62.2,
                endAge: 70.4,
              },
            ],
          },
        },
      },
    };
  }
);

When(
  "the saved plan is migrated to the current settings schema",
  function (this: QuarterYearAgeWorld) {
    assertCondition(this.storedEnvelope, "Expected a stored settings envelope");
    this.migratedData = migrateSettingsToLatest(this.storedEnvelope);
  }
);

Then(
  "the migrated ages should be:",
  function (this: QuarterYearAgeWorld, table: DataTable) {
    const migratedAges = getMigratedAges(this.migratedData);

    for (const row of table.hashes()) {
      assertEqual(migratedAges[row.age], Number(row.modelledAge));
    }
  }
);

When(
  "pension ages and dates are derived for someone born on {word}",
  function (this: QuarterYearAgeWorld, dateOfBirth: string) {
    this.normalPensionAge = calculateNormalPensionAge(dateOfBirth);
    this.statePensionDate = calculateStatePensionDrawDate(dateOfBirth);
  }
);

Then(
  "the numeric Alpha Normal Pension Age should be {float}",
  function (this: QuarterYearAgeWorld, expectedAge: number) {
    assertEqual(this.normalPensionAge, expectedAge);
  }
);

Then(
  "the State Pension date should remain {word}",
  function (this: QuarterYearAgeWorld, expectedDate: string) {
    assertEqual(this.statePensionDate, expectedDate);
  }
);

Given(
  "an expert plan with untouched retirement age defaults",
  function (this: QuarterYearAgeWorld) {
    this.expertSettings = createDefaultSettings();
  }
);

When(
  "the expert date of birth changes to {word}",
  function (this: QuarterYearAgeWorld, dateOfBirth: string) {
    assertCondition(this.expertSettings, "Expected expert settings");
    let next = this.expertSettings;

    updateSetting({
      key: "dateOfBirth",
      value: dateOfBirth,
      journeyMode: "expert",
      showSavedLabel: () => undefined,
      setChartUndoStack: () => undefined,
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    this.expertSettings = next;
  }
);

Then(
  "the expert default ages should be:",
  function (this: QuarterYearAgeWorld, table: DataTable) {
    assertCondition(this.expertSettings, "Expected expert settings");
    const [expected] = table.hashes();
    const settings = this.expertSettings;

    assertEqual(settings.normalPensionAge, Number(expected.normalPensionAge));
    assertEqual(settings.requirementAge, Number(expected.targetRetirementAge));
    assertEqual(
      settings.alphaPensionLeaveAge,
      Number(expected.alphaSchemeLeaveAge)
    );
    assertEqual(
      settings.alphaPensionDrawAge,
      Number(expected.alphaPensionDrawAge)
    );
    assertEqual(
      calculateStatePensionDrawAge(
        settings.dateOfBirth,
        settings.statePensionDrawDate
      ),
      Number(expected.statePensionStartAge)
    );
    assertEqual(settings.sippDrawAge, Number(expected.sippDrawStartAge));
  }
);

function getMigratedAges(data: unknown) {
  assertCondition(isRecord(data), "Expected migrated settings data");
  assertCondition(
    isRecord(data.journeys),
    "Expected migrated journey settings"
  );
  assertCondition(
    isRecord(data.journeys.simple),
    "Expected simple journey settings"
  );

  const simple = data.journeys.simple;
  assertCondition(isRecord(simple.spendingSmile), "Expected spending phases");
  assertCondition(
    Array.isArray(simple.additionalGuaranteedIncomes),
    "Expected additional guaranteed incomes"
  );
  const additionalGuaranteedIncomes: unknown[] =
    simple.additionalGuaranteedIncomes;
  const income = additionalGuaranteedIncomes[0];
  assertCondition(isRecord(income), "Expected an additional income");

  return {
    "target retirement age": simple.requirementAge,
    "life expectancy": simple.lifeExpectancy,
    "slow-go start age": simple.spendingSmile.slowGoStartAge,
    "no-go start age": simple.spendingSmile.noGoStartAge,
    "additional income start age": income.startAge,
    "additional income end age": income.endAge,
  } as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertCondition(
  condition: unknown,
  message = "Expected condition to be true"
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}
