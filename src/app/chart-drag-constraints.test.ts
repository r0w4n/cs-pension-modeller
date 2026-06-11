import {
  clampNumber,
  clampToLimit,
  snapToLimit,
} from "./chart-drag-constraints";

describe("chart-drag-constraints", () => {
  it("clamps values to explicit minimum and maximum bounds", () => {
    expect(clampNumber(39, 40, 70)).toBe(40);
    expect(clampNumber(71, 40, 70)).toBe(70);
    expect(clampNumber(55, 40, 70)).toBe(55);
  });

  it("clamps values to a chart limit", () => {
    expect(clampToLimit(30, { min: 40, max: 70, step: 1 })).toBe(40);
    expect(clampToLimit(75, { min: 40, max: 70, step: 1 })).toBe(70);
  });

  it("snaps values to the nearest configured step after clamping", () => {
    expect(snapToLimit(40.49, { min: 40, max: 70, step: 1 })).toBe(40);
    expect(snapToLimit(40.5, { min: 40, max: 70, step: 1 })).toBe(41);
    expect(snapToLimit(75, { min: 40, max: 70, step: 1 })).toBe(70);
  });

  it("preserves decimal precision for quarter-year marker steps", () => {
    expect(snapToLimit(57.37, { min: 57.25, max: 80, step: 0.25 })).toBe(57.25);
    expect(snapToLimit(57.38, { min: 57.25, max: 80, step: 0.25 })).toBe(57.5);
  });
});
