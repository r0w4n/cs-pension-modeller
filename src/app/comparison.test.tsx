import { fireEvent, render, screen } from "@testing-library/react";
import { ComparisonPanel, ComparisonSection } from "./comparison";
import { createDefaultSettings } from "../settings";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { ScenarioBuilder } from "./scenario-builder";

describe("comparison module", () => {
  it("explains paused saving and offers recovery when saved comparison data is invalid", () => {
    const settings = createDefaultSettings();
    const download = vi.fn();
    render(
      <ComparisonPanel
        settings={settings}
        validationIssues={[]}
        scenarios={[]}
        retirementPlanResult={calculateRetirementPlan(settings)}
        onScenariosChange={vi.fn()}
        onLoadScenario={vi.fn()}
        onDownloadComparisonRecovery={download}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "original saved data has been kept on this device"
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Changes to comparisons will stay in this session"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download saved comparison data" })
    );
    expect(download).toHaveBeenCalledOnce();
  });
  it("renders comparison section children", () => {
    render(
      <ComparisonSection>
        <p>Comparison child</p>
      </ComparisonSection>
    );

    expect(screen.getByText("Comparison child")).toBeInTheDocument();
  });

  it("supports adding a scenario", () => {
    const setScenarioNameDraft = vi.fn();
    const addCurrentScenario = vi.fn();

    render(
      <ScenarioBuilder
        scenarioCount={1}
        isValid
        limitReached={false}
        nameValue=""
        onNameChange={setScenarioNameDraft}
        onAdd={addCurrentScenario}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Scenario name" }), {
      target: { value: "My scenario" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to comparison" }));

    expect(setScenarioNameDraft).toHaveBeenCalledWith("My scenario");
    expect(addCurrentScenario).toHaveBeenCalled();
  });

  it("waits for an updated calculation before adding a scenario", () => {
    render(
      <ScenarioBuilder
        scenarioCount={0}
        isValid
        isPending
        limitReached={false}
        nameValue=""
        onNameChange={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Add to comparison" })
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Wait for the updated calculation before adding this scenario."
      )
    ).toBeInTheDocument();
  });
});
