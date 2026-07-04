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
});
