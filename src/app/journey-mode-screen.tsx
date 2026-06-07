import type { RefObject } from "react";
import type { PensionSettings } from "../settings";
import type { JourneyDefinition } from "../app-domains";
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
};

export function JourneyModeScreen({
  activeModeRef,
  mode,
  journey,
  settings,
  settingsFormVersion,
  journeyStepViewModel,
}: JourneyModeScreenProps) {
  return (
    <JourneySection activeModeRef={activeModeRef}>
      <JourneyFlowFeature
        key={`${mode}-${settingsFormVersion}`}
        journey={journey}
        settings={settings}
        renderStepContent={(step) => (
          <JourneyStepContent step={step} viewModel={journeyStepViewModel} />
        )}
      />
    </JourneySection>
  );
}
