import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { createDefaultSettings } from "../settings";
import { GuidanceNotesToggle, JourneyFlow, JourneySection } from "./journey";

describe("journey module", () => {
  const originalMatchMedia = window.matchMedia?.bind(window);

  const mockMatchMedia = (matches: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

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
    const onActiveStepChange = vi.fn();

    render(
      <JourneyFlow
        journey={{
          id: "test",
          title: "Test journey",
          description: "Journey description",
          settingsPresentation: {
            alignAlphaLeaveAgeToRetirement: false,
            dateOfBirthUpdate: "preserve-retirement-ages",
          },
          steps: [
            {
              id: "one",
              eyebrow: "Step 1",
              title: "First step",
              description: "First description",
              kind: "results",
              sections: [],
            },
            {
              id: "two",
              eyebrow: "Step 2",
              title: "Second step",
              description: "Second description",
              kind: "results",
              sections: [],
              visible: (currentSettings) => currentSettings.showAlpha,
            },
          ],
        }}
        settings={settings}
        onActiveStepChange={onActiveStepChange}
        renderStepContent={(step) => <p>{step.id}-content</p>}
      />
    );

    expect(screen.getByText("one-content")).toBeInTheDocument();
    expect(onActiveStepChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "one" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Show my answer" }));
    expect(screen.getByText("two-content")).toBeInTheDocument();
    expect(onActiveStepChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "two" })
    );
  });

  it.each(["simple-early-retirement", "early-retirement-bridge"])(
    "collapses the %s mobile journey steps behind a disclosure",
    (journeyId) => {
      mockMatchMedia(true);
      const settings = createDefaultSettings();

      render(
        <JourneyFlow
          journey={{
            id: journeyId,
            title: "Test journey",
            description: "Journey description",
            settingsPresentation: {
              alignAlphaLeaveAgeToRetirement: false,
              dateOfBirthUpdate: "preserve-retirement-ages",
            },
            steps: [
              {
                id: "one",
                eyebrow: "Step 1",
                title: "First step",
                description: "First description",
                kind: "results",
                sections: [],
              },
            ],
          }}
          settings={settings}
          renderStepContent={(step) => <p>{step.id}-content</p>}
        />
      );

      const mobileStepList = document.querySelector(
        ".journey-mobile-step-list"
      );
      const stepDisclosure = screen.getByText("View all steps");

      expect(mobileStepList).toBeInTheDocument();
      expect(stepDisclosure.closest("details")).not.toHaveAttribute("open");

      fireEvent.click(stepDisclosure);

      expect(stepDisclosure.closest("details")).toHaveAttribute("open");
      expect(
        within(mobileStepList as HTMLElement).getByRole("button", {
          name: /First step/,
        })
      ).toBeInTheDocument();
    }
  );

  it("labels the action after a plan review as Calculate my plan", () => {
    render(
      <JourneyFlow
        journey={{
          id: "early-retirement-bridge",
          title: "Bridge journey",
          description: "Journey description",
          settingsPresentation: {
            alignAlphaLeaveAgeToRetirement: false,
            dateOfBirthUpdate: "preserve-retirement-ages",
          },
          steps: [
            {
              id: "check-plan",
              eyebrow: "Review",
              title: "Check your plan",
              description: "Review choices",
              kind: "review",
              presentation: "bridge-plan",
            },
            {
              id: "answer",
              eyebrow: "Result",
              title: "Your results",
              description: "Review results",
              kind: "results",
              sections: [],
            },
          ],
        }}
        settings={createDefaultSettings()}
        renderStepContent={(step) => <p>{step.id}-content</p>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Calculate my plan" }));

    expect(screen.getByText("answer-content")).toBeInTheDocument();
  });
});
