import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { createDefaultSettings } from "../settings";
import { GuidanceNotesToggle, JourneyFlow, JourneySection } from "./journey";

describe("journey module", () => {
  it("renders journey section wrapper", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <JourneySection activeModeRef={ref}>
        <p>Body</p>
      </JourneySection>
    );

    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("emits guidance toggle updates", () => {
    const onChange = vi.fn();

    render(<GuidanceNotesToggle checked onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("renders visible steps and advances through the journey", () => {
    const settings = createDefaultSettings();

    render(
      <JourneyFlow
        journey={{
          id: "test",
          title: "Test journey",
          description: "Journey description",
          steps: [
            {
              id: "one",
              eyebrow: "Step 1",
              title: "First step",
              description: "First description",
              kind: "answer",
            },
            {
              id: "two",
              eyebrow: "Step 2",
              title: "Second step",
              description: "Second description",
              kind: "answer",
              visible: (currentSettings) => currentSettings.showAlpha,
            },
          ],
        }}
        settings={settings}
        renderStepContent={(step) => <p>{step.id}-content</p>}
      />
    );

    expect(screen.getByText("one-content")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show my answer" }));
    expect(screen.getByText("two-content")).toBeInTheDocument();
  });
});
