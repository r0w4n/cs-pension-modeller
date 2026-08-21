import { useCallback, type RefObject } from "react";
import type { PensionSettings } from "../settings";
import type { JourneyDefinition } from "../app-domains";
import { Helmet } from "../helmet";
import {
  JourneyStepContent,
  type JourneyStepViewModel,
} from "./journey-step-content";
import { JourneyFlow as JourneyFlowFeature, JourneySection } from "./journey";

export type JourneyMode = "bridge" | "simple" | "expert";

type JourneyModeScreenProps = {
  activeModeRef: RefObject<HTMLDivElement | null>;
  mode: JourneyMode;
  journey: JourneyDefinition;
  settings: PensionSettings;
  settingsFormVersion: number;
  journeyStepViewModel: JourneyStepViewModel;
  onResultsStepActiveChange: (active: boolean) => void;
};

export function JourneyModeScreen({
  activeModeRef,
  mode,
  journey,
  settings,
  settingsFormVersion,
  journeyStepViewModel,
  onResultsStepActiveChange,
}: JourneyModeScreenProps) {
  const handleActiveStepChange = useCallback(
    (step: JourneyDefinition["steps"][number]) => {
      onResultsStepActiveChange(step.kind === "results");
    },
    [onResultsStepActiveChange]
  );

  return (
    <JourneySection activeModeRef={activeModeRef}>
      <Helmet>
        <title>{`${journey.title} | Civil Service Pension Modeller`}</title>
        <meta name="description" content={journey.description} />
      </Helmet>

      <JourneyFlowFeature
        key={`${mode}-${settingsFormVersion}`}
        journey={journey}
        settings={settings}
        onActiveStepChange={handleActiveStepChange}
        renderStepContent={(step) => (
          <JourneyStepContent step={step} viewModel={journeyStepViewModel} />
        )}
      />
    </JourneySection>
  );
}
