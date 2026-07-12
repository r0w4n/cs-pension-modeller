import { createDefaultSettings } from "./settings-defaults";
import { validateSettings } from "./settings-validate";

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

  it("flags invalid additional guaranteed income rows", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
      lifeExpectancy: 90,
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

  it("treats a blank additional guaranteed income row as a draft", () => {
    const issues = validateSettings({
      ...createDefaultSettings(),
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
