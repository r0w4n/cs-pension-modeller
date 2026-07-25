import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "../settings";
import { SpendingSmileEditor } from "./spending-smile-editor";

describe("SpendingSmileEditor", () => {
  it("does not draw a phase boundary after the projection ends", () => {
    const settings = {
      ...createDefaultSettings(),
      lifeExpectancy: 80,
      spendingStrategyType: "SPENDING_SMILE" as const,
    };
    render(<SpendingSmileEditor settings={settings} onChange={vi.fn()} />);

    expect(screen.getAllByTestId("spending-phase-boundary")).toHaveLength(1);
    expect(screen.getByLabelText("Slow-go years starts at age")).toHaveValue(
      75
    );
    expect(screen.getByLabelText("No-go years starts at age")).toHaveValue(85);
    expect(
      screen.getByText(
        "This phase starts after the end of the current projection."
      )
    ).toBeInTheDocument();
  });
});
