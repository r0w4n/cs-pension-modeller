import { describe, expect, it } from "vitest";
import {
  buildComparisonTableRows,
  createComparisonResult,
} from "./comparison";
import { createDefaultSettings } from "../settings";

describe("comparison table rows", () => {
  it("uses section divider rows and simplified default metric labels", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings),
    );

    const rows = buildComparisonTableRows([result]);
    expect(rows.some((row) => row.isSectionDivider && row.section === "Headline outcome")).toBe(
      true,
    );
    expect(rows.some((row) => row.metric === "Status")).toBe(true);
    expect(rows.some((row) => row.metric === "Section")).toBe(false);
    expect(rows.some((row) => row.metric === "Overall status")).toBe(false);
    expect(rows.some((row) => row.metric === "Target income")).toBe(true);
  });
});
