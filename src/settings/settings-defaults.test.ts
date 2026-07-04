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

  it("defaults ISA and SIPP draw ages to Normal Pension Age and nuvos to age 65", () => {
    const settings = createDefaultSettings();

    expect(settings.normalPensionAge).toBe(68);
    expect(settings.isaDrawAge).toBe(68);
    expect(settings.sippDrawAge).toBe(68);
    expect(settings.nuvosPensionDrawAge).toBe(65);
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
