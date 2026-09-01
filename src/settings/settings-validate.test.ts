import {
  createDefaultPartnerSettings,
  createDefaultSettings,
} from "./settings-defaults";
import type { PensionSettings } from "./settings-types";
import {
  createPartnerCalculationSettings,
  createPartnerIndividualSettings,
  validateSettings,
} from "./settings-validate";

describe("settings-validate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flags state pension dates below minimum", () => {
    const settings = {
      ...createDefaultSettings(),
      showStatePension: true,
      statePensionDrawDate: "2020-01-01",
    };

    const issues = validateSettings(settings);
    expect(issues.some((issue) => issue.field === "statePensionDrawDate")).toBe(
      true
    );
  });

  it("returns no issues for defaults", () => {
    expect(validateSettings(createDefaultSettings())).toEqual([]);
  });

  it("preserves Partner's own person-level target settings outside coordinated funding", () => {
    const defaults = createDefaultSettings();
    const settings = {
      ...defaults,
      partner: {
        ...createDefaultPartnerSettings(),
        desiredRetirementIncome: 24_000,
        retirementIncomeTargetBasis: "gross" as const,
        spendingStrategyType: "SPENDING_SMILE" as const,
        flexibleWithdrawalPriority: [
          "isa",
          "sipp",
        ] as PensionSettings["flexibleWithdrawalPriority"],
      },
    };

    const individual = createPartnerIndividualSettings(settings);
    const household = createPartnerCalculationSettings(settings);

    expect(individual).toMatchObject({
      desiredRetirementIncome: 24_000,
      retirementIncomeTargetBasis: "gross",
      spendingStrategyType: "SPENDING_SMILE",
      flexibleWithdrawalPriority: ["isa", "sipp"],
    });
    expect(household).toMatchObject({
      desiredRetirementIncome: 0,
      retirementIncomeTargetBasis: "after_tax",
      spendingStrategyType: "FLAT",
      flexibleWithdrawalPriority: [],
    });
  });

  it("does not allow prior lump-sum allowance use to exceed the selected allowance", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      taxationEnabled: true,
      taxTrackLumpSumAllowance: true,
      taxLumpSumAllowance: 100_000,
      taxLumpSumAllowanceUsed: 100_001,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "taxLumpSumAllowanceUsed" }),
      ])
    );
  });

  it("flags invalid personal dates without throwing", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      dateOfBirth: "bad-date",
      startDate: "also-bad",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "dateOfBirth" }),
        expect.objectContaining({ field: "startDate" }),
      ])
    );
  });

  it("does not report a Partner life-expectancy error until a Partner DOB is entered", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      jointRetirement: {
        ...createDefaultSettings().jointRetirement,
        enabled: true,
      },
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "",
        showStatePension: true,
      },
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "dateOfBirth",
          personId: "partner",
        }),
      ])
    );
    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "lifeExpectancy",
          personId: "partner",
        }),
      ])
    );
    expect(issues.filter((issue) => issue.personId === "partner")).toEqual([
      expect.objectContaining({
        field: "dateOfBirth",
        personId: "partner",
      }),
    ]);
  });

  it("validates household SMILE phases against the later retiree", () => {
    const partner = {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1990-06-01",
      requirementAge: 78,
      lifeExpectancy: 95,
    };
    const defaults = createDefaultSettings();

    const issues = validateSettings({
      ...defaults,
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        spendingStrategyType: "SPENDING_SMILE",
        spendingSmile: {
          ...defaults.jointRetirement.spendingSmile,
          slowGoStartAge: 75,
        },
      },
      partner,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "jointRetirement",
          itemId: "slowGoStartAge",
          message: "Slow-go years must start after Partner's retirement age.",
        }),
      ])
    );
  });

  it("does not validate an inactive single-person SMILE in joint mode", () => {
    const defaults = createDefaultSettings();

    const issues = validateSettings({
      ...defaults,
      spendingStrategyType: "SPENDING_SMILE",
      spendingSmile: {
        ...defaults.spendingSmile,
        slowGoStartAge: defaults.requirementAge,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        spendingStrategyType: "FLAT",
      },
      partner: createDefaultPartnerSettings(),
    });

    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "spendingSmile",
          itemId: "slowGoStartAge",
        }),
      ])
    );
  });

  it("flags invalid additional guaranteed income rows", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      lifeExpectancy: 90,
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [
        {
          id: "bad-ages",
          name: "",
          annualAmount: -1000,
          startAge: 95,
          endAge: 60,
          indexation: "none",
          fixedIncreasePercent: null,
          taxable: true,
        },
        {
          id: "missing-fixed",
          name: "",
          annualAmount: 6000,
          startAge: 67,
          endAge: null,
          indexation: "fixed",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "bad-ages",
          message: "Annual amount must be zero or more.",
        }),
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "bad-ages",
          message: "Start age must be within the projection range.",
        }),
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "bad-ages",
          message: "End age must be the same as or later than the start age.",
        }),
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "missing-fixed",
          message: "Enter a fixed annual increase percentage.",
        }),
      ])
    );
  });

  it("ignores additional guaranteed income validation when its section is disabled", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      showAdditionalGuaranteedIncome: false,
      additionalGuaranteedIncomes: [
        {
          id: "bad-ages",
          name: "",
          annualAmount: -1000,
          startAge: 95,
          endAge: 60,
          indexation: "none",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    });

    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "bad-ages",
        }),
      ])
    );
  });

  it("treats a blank additional guaranteed income row as a draft", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [
        {
          id: "draft-income",
          name: "",
          annualAmount: null,
          startAge: 60,
          endAge: null,
          indexation: "cpi",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    });

    expect(issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "draft-income",
        }),
      ])
    );
  });

  it("requires a start age once additional guaranteed income has an amount", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [
        {
          id: "missing-start-age",
          name: "",
          annualAmount: 6000,
          startAge: null,
          endAge: null,
          indexation: "cpi",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "additionalGuaranteedIncomes",
          itemId: "missing-start-age",
          message: "Enter a start age.",
        }),
      ])
    );
  });
});
