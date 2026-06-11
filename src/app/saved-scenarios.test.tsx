import { fireEvent, render, screen } from "@testing-library/react";
import { createComparisonResult } from "../app-domains";
import { createDefaultSettings } from "../settings";
import { SavedScenariosSection } from "./saved-scenarios";

describe("saved scenarios", () => {
  it("shows the empty state when no scenarios are saved", () => {
    render(
      <SavedScenariosSection
        scenarios={[]}
        savedResults={[]}
        maxScenarios={5}
        onLoadScenario={vi.fn()}
        renameScenario={vi.fn()}
        removeScenario={vi.fn()}
      />
    );

    expect(screen.getByText("0 of 5 saved")).toBeInTheDocument();
    expect(screen.getByText(/No scenarios saved yet\./i)).toBeInTheDocument();
  });

  it("renders saved results and wires rename, load, and remove actions", () => {
    const settings = createDefaultSettings();
    const matchingResult = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model copy",
        settings,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      JSON.stringify(settings)
    );
    const alternateSettings = {
      ...settings,
      desiredRetirementIncome: settings.desiredRetirementIncome + 5000,
    };
    const alternateResult = {
      ...createComparisonResult(
        {
          id: "scenario-2",
          name: "Later retirement",
          settings: alternateSettings,
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
        JSON.stringify(settings)
      ),
      bridgeAnalysis: {
        ...matchingResult.bridgeAnalysis,
        planWorks: false,
      },
    };
    const onLoadScenario = vi.fn();
    const renameScenario = vi.fn();
    const removeScenario = vi.fn();

    render(
      <SavedScenariosSection
        scenarios={[matchingResult.scenario, alternateResult.scenario]}
        savedResults={[matchingResult, alternateResult]}
        maxScenarios={5}
        onLoadScenario={onLoadScenario}
        renameScenario={renameScenario}
        removeScenario={removeScenario}
      />
    );

    expect(screen.getByText("2 of 5 saved")).toBeInTheDocument();
    expect(screen.getByText("Looks workable")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(
      screen.getByText("Matches current model inputs")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Current model inputs differ from this saved snapshot")
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Scenario name" })[1],
      {
        target: { value: "Bridge first" },
      }
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Load this scenario" })[1]
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    expect(renameScenario).toHaveBeenCalledWith("scenario-2", "Bridge first");
    expect(onLoadScenario).toHaveBeenCalledWith(alternateSettings);
    expect(removeScenario).toHaveBeenCalledWith("scenario-1");
  });
});
