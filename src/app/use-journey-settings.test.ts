import { formatParameterExportTimestamp } from "./use-journey-settings";

describe("parameter export filename", () => {
  it("includes the local date, hour, and minute", () => {
    const exportTime = new Date(2026, 6, 29, 14, 8);

    expect(formatParameterExportTimestamp(exportTime)).toBe("2026-07-29-14-08");
  });
});
