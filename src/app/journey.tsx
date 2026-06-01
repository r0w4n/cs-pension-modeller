import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { JourneyDefinition, JourneyStepDefinition } from "../app-domains";
import type { PensionSettings } from "../settings";

type JourneySectionProps = {
  activeModeRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

export function JourneySection({
  activeModeRef,
  children,
}: JourneySectionProps) {
  return (
    <div ref={activeModeRef} className="active-mode-region" tabIndex={-1}>
      {children}
    </div>
  );
}

type GuidanceNotesToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function GuidanceNotesToggle({
  checked,
  onChange,
}: GuidanceNotesToggleProps) {
  return (
    <label className="guidance-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Show guidance notes</span>
    </label>
  );
}

type JourneyFlowProps = {
  journey: JourneyDefinition;
  settings: PensionSettings;
  showGuidanceNotes: boolean;
  onShowGuidanceNotesChange: (checked: boolean) => void;
  renderStepContent: (step: JourneyStepDefinition) => ReactNode;
};

export function JourneyFlow({
  journey,
  settings,
  showGuidanceNotes,
  onShowGuidanceNotesChange,
  renderStepContent,
}: JourneyFlowProps) {
  const visibleSteps = journey.steps.filter(
    (step) => !step.visible || step.visible(settings)
  );
  const [activeStepId, setActiveStepId] = useState(visibleSteps[0]?.id ?? "");
  const [showMobileSteps, setShowMobileSteps] = useState(false);
  const activeStep =
    visibleSteps.find((step) => step.id === activeStepId) ?? visibleSteps[0];
  const activeStepIndex = Math.max(
    0,
    visibleSteps.findIndex((step) => step.id === activeStep?.id)
  );
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === visibleSteps.length - 1;
  const stepperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeStep) {
      return;
    }

    if (typeof stepperRef.current?.scrollIntoView === "function") {
      stepperRef.current.scrollIntoView({ block: "start" });
    }
  }, [activeStep]);

  if (!activeStep) {
    return null;
  }

  const getStepState = (stepIndex: number) => {
    if (stepIndex === activeStepIndex) {
      return "active";
    }

    return stepIndex < activeStepIndex ? "completed" : "upcoming";
  };

  const goToStep = (stepIndex: number) => {
    const nextStep = visibleSteps[stepIndex];

    if (nextStep) {
      setShowMobileSteps(false);
      setActiveStepId(nextStep.id);
    }
  };

  return (
    <section className="panel journey-panel" aria-labelledby="journey-title">
      <div className="journey-heading">
        <div>
          <p className="eyebrow">Journey</p>
          <h2 id="journey-title">{journey.title}</h2>
          <p className="section-copy">{journey.description}</p>
        </div>
        <div className="journey-heading-actions">
          <div className="journey-progress" aria-label="Journey progress">
            Step {activeStepIndex + 1} of {visibleSteps.length}
          </div>
          <GuidanceNotesToggle
            checked={showGuidanceNotes}
            onChange={onShowGuidanceNotesChange}
          />
        </div>
      </div>

      <nav
        ref={stepperRef}
        className="journey-stepper"
        aria-label="Journey steps"
      >
        {visibleSteps.map((step, index) => {
          const stepState = getStepState(index);

          return (
            <button
              key={step.id}
              type="button"
              className={`journey-step-button journey-step-button--${stepState}`}
              aria-current={step.id === activeStep.id ? "step" : undefined}
              data-step-state={stepState}
              onClick={() => goToStep(index)}
            >
              <span>{index + 1}</span>
              {step.title}
            </button>
          );
        })}
      </nav>

      <section
        className="journey-step"
        aria-labelledby={`journey-step-${activeStep.id}`}
      >
        <div className="journey-mobile-steps">
          <div className="journey-mobile-step-summary">
            <div>
              <span>
                Step {activeStepIndex + 1} of {visibleSteps.length}
              </span>
              <strong>{activeStep.title}</strong>
            </div>
            <button
              type="button"
              className="secondary-button"
              aria-expanded={showMobileSteps}
              aria-controls="journey-mobile-step-list"
              onClick={() => setShowMobileSteps((current) => !current)}
            >
              {showMobileSteps ? "Hide steps" : "View all steps"}
            </button>
          </div>
          <div
            className="journey-progress-bar"
            role="progressbar"
            aria-label="Journey progress"
            aria-valuemin={1}
            aria-valuemax={visibleSteps.length}
            aria-valuenow={activeStepIndex + 1}
          >
            <span
              style={{
                width: `${((activeStepIndex + 1) / visibleSteps.length) * 100}%`,
              }}
            />
          </div>
          {showMobileSteps ? (
            <nav
              id="journey-mobile-step-list"
              className="journey-mobile-step-list"
              aria-label="Journey steps"
            >
              {visibleSteps.map((step, index) => {
                const stepState = getStepState(index);

                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`journey-step-button journey-step-button--${stepState}`}
                    aria-current={
                      step.id === activeStep.id ? "step" : undefined
                    }
                    data-step-state={stepState}
                    onClick={() => goToStep(index)}
                  >
                    <span>{index + 1}</span>
                    {step.title}
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="section-heading">
          <p className="eyebrow">{activeStep.eyebrow}</p>
          <h3 id={`journey-step-${activeStep.id}`}>{activeStep.title}</h3>
          <p className="section-copy">{activeStep.description}</p>
        </div>

        {renderStepContent(activeStep)}

        <div className="journey-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isFirstStep}
            onClick={() => goToStep(activeStepIndex - 1)}
          >
            Back
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isLastStep}
            onClick={() => goToStep(activeStepIndex + 1)}
          >
            {activeStepIndex === visibleSteps.length - 2
              ? "Show my answer"
              : "Next"}
          </button>
        </div>
      </section>
    </section>
  );
}
