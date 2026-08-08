import {
  createDefaultSettings,
  formatLocalIsoDate,
  getTodayIsoDate,
} from "./settings-defaults";

describe("settings-defaults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives today in local ISO format", () => {
    expect(getTodayIsoDate()).toBe("2026-04-25");
    expect(createDefaultSettings().startDate).toBe("2026-04-25");
  });

  it("defaults ISA and SIPP draw ages to whole years rounded down from NPA", () => {
    const settings = createDefaultSettings();

    expect(settings.normalPensionAge).toBe(68);
    expect(settings.isaDrawAge).toBe(58);
    expect(settings.sippDrawAge).toBe(68);
    expect(settings.classicPensionDrawAge).toBe(60);
    expect(settings.classicPlusPensionDrawAge).toBe(60);
    expect(settings.nuvosPensionDrawAge).toBe(65);
  });

  it("excludes additional guaranteed income by default", () => {
    expect(createDefaultSettings().showAdditionalGuaranteedIncome).toBe(false);
  });

  it("formats local date parts", () => {
    expect(
      formatLocalIsoDate({
        getFullYear: () => 2026,
        getMonth: () => 3,
        getDate: () => 25,
      })
    ).toBe("2026-04-25");
  });
});
