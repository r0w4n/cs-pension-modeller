import {
  formatModelAge,
  formatModelAgeCompact,
  isModelAge,
  roundModelAge,
} from "./age";

describe("quarter-year modelling ages", () => {
  it.each([
    [67.1, 67],
    [67.16666666666667, 67.25],
    [67.4, 67.5],
    [67.7, 67.75],
    [67.9, 68],
  ])("rounds %s to %s", (value, expected) => {
    expect(roundModelAge(value)).toBe(expected);
  });

  it("recognises and formats quarter-year values", () => {
    expect(isModelAge(67.25)).toBe(true);
    expect(isModelAge(67.2)).toBe(false);
    expect(formatModelAge(67.25)).toBe("67 years 3 months");
    expect(formatModelAgeCompact(67.5)).toBe("67y 6m");
  });
});
