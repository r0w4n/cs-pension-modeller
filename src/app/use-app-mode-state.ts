import { useCallback, useEffect, useRef, useState } from "react";
import { JOURNEY_DEFINITIONS } from "../app-domains/journeys";
import { loadStoredAppMode, type AppMode } from "./app-persistence";

const [
  bridgeJourneyDefinition,
  simpleJourneyDefinition,
  expertJourneyDefinition,
] = JOURNEY_DEFINITIONS;

const JOURNEY_DEFINITION_BY_MODE = {
  bridge: bridgeJourneyDefinition,
  simple: simpleJourneyDefinition,
  expert: expertJourneyDefinition,
} satisfies Record<AppMode, (typeof JOURNEY_DEFINITIONS)[number]>;

export function useAppModeState() {
  const initialAppMode = loadStoredAppMode();
  const [appMode, setAppMode] = useState<AppMode | null>(initialAppMode);
  const activeModeRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusActiveMode = useRef(false);

  const scrollActiveModeIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      activeModeRef.current?.focus({ preventScroll: true });
      if (typeof activeModeRef.current?.scrollIntoView === "function") {
        activeModeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!appMode || !shouldFocusActiveMode.current) {
      return;
    }

    shouldFocusActiveMode.current = false;
    scrollActiveModeIntoView();
  }, [appMode, scrollActiveModeIntoView]);

  const activeJourneyMode = appMode;
  const activeJourneyDefinition = activeJourneyMode
    ? JOURNEY_DEFINITION_BY_MODE[activeJourneyMode]
    : null;

  return {
    activeJourneyDefinition,
    activeJourneyMode,
    activeModeRef,
    appMode,
    initialAppMode,
    scrollActiveModeIntoView,
    setAppMode,
    shouldFocusActiveMode,
  };
}
