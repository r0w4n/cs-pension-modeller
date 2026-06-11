import { fireEvent, render, screen } from "@testing-library/react";
import { ComparisonSection } from "./comparison";
import { ScenarioBuilder } from "./scenario-builder";

describe("comparison module", () => {
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
});
