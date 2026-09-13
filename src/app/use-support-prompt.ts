import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  trackSupportPromptEvent,
  type SupportPromptAnalyticsEvent,
} from "./support-prompt-analytics";
import {
  SUPPORT_PROMPT_DEBUG_SHOW_EVENT,
  SUPPORT_PROMPT_DELAY_MS,
} from "./support-prompt-config";
import {
  createSupportPromptDeclinedPreference,
  createSupportPromptSnoozePreference,
  createSupportPromptSupportedPreference,
  isSupportPromptEligible,
} from "./support-prompt-lifecycle";
import {
  clearStoredSupportPromptPreference,
  loadSupportPromptPreference,
  saveSupportPromptPreference,
  type SupportPromptPreference,
} from "./support-prompt-storage";

export type SupportPromptViewModel = {
  isOpen: boolean;
  showThankYouStatus: boolean;
  dismissThankYouStatus: () => void;
  buyCoffee: () => void;
  maybeLater: () => void;
  dismiss: () => void;
  markSupported: () => void;
  decline: () => void;
};

export function useSupportPrompt({
  isResultsStepActive,
  isProjectionPending,
  calculationError,
  localStorageEnabled,
}: {
  isResultsStepActive: boolean;
  isProjectionPending: boolean;
  calculationError: boolean;
  localStorageEnabled: boolean;
}) {
  const [preference, setPreference] = useState<SupportPromptPreference | null>(
    loadSupportPromptPreference
  );
  const [documentVisible, setDocumentVisible] = useState(isDocumentVisible);
  const [sessionSuppressed, setSessionSuppressed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showThankYouStatus, setShowThankYouStatus] = useState(false);
  const latestEligibilityRef = useRef(false);
  const hasTrackedShownRef = useRef(false);
  const hasProcessedThankYouReturnRef = useRef(false);
  const actionHandledRef = useRef(false);

  const rememberPreference = useCallback(
    (nextPreference: SupportPromptPreference) => {
      setPreference(nextPreference);
      saveSupportPromptPreference(nextPreference);
    },
    []
  );

  const eligible = useMemo(
    () =>
      isSupportPromptEligible({
        activeJourneyStep: isResultsStepActive ? "results" : "other",
        calculationFinished: !isProjectionPending,
        calculationError,
        documentVisible,
        preference,
        sessionSuppressed,
        now: new Date(),
      }),
    [
      calculationError,
      documentVisible,
      isProjectionPending,
      isResultsStepActive,
      preference,
      sessionSuppressed,
    ]
  );
  latestEligibilityRef.current = eligible;

  useEffect(() => {
    function handleVisibilityChange() {
      setDocumentVisible(isDocumentVisible());
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!eligible) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!latestEligibilityRef.current) {
        return;
      }

      setIsOpen(true);
      setSessionSuppressed(true);
      actionHandledRef.current = false;
      if (!hasTrackedShownRef.current) {
        trackSupportPromptEvent("shown");
        hasTrackedShownRef.current = true;
      }
    }, SUPPORT_PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [eligible]);

  useEffect(() => {
    if (!localStorageEnabled) {
      clearStoredSupportPromptPreference();
    }
  }, [localStorageEnabled]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return;
    }

    function handleDebugShowPrompt() {
      setIsOpen(true);
      setSessionSuppressed(true);
      actionHandledRef.current = false;
    }

    window.addEventListener(
      SUPPORT_PROMPT_DEBUG_SHOW_EVENT,
      handleDebugShowPrompt
    );

    return () => {
      window.removeEventListener(
        SUPPORT_PROMPT_DEBUG_SHOW_EVENT,
        handleDebugShowPrompt
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (
      hasProcessedThankYouReturnRef.current ||
      url.searchParams.get("support") !== "thank-you"
    ) {
      return;
    }

    hasProcessedThankYouReturnRef.current = true;
    const thankYouTimer = window.setTimeout(() => {
      const nextPreference = createSupportPromptSupportedPreference(new Date());
      rememberPreference(nextPreference);
      setShowThankYouStatus(true);
      trackSupportPromptEvent("paymentReturned");
    }, 0);
    url.searchParams.delete("support");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );

    return () => {
      window.clearTimeout(thankYouTimer);
    };
  }, [rememberPreference]);

  const closeWithPreference = useCallback(
    (
      nextPreference: SupportPromptPreference,
      event: SupportPromptAnalyticsEvent
    ) => {
      if (actionHandledRef.current) {
        return;
      }

      actionHandledRef.current = true;
      rememberPreference(nextPreference);
      setIsOpen(false);
      setSessionSuppressed(true);
      trackSupportPromptEvent(event);
    },
    [rememberPreference]
  );

  const maybeLater = useCallback(() => {
    closeWithPreference(
      createSupportPromptSnoozePreference(new Date()),
      "maybeLaterSelected"
    );
  }, [closeWithPreference]);

  const dismiss = useCallback(() => {
    closeWithPreference(
      createSupportPromptSnoozePreference(new Date()),
      "dismissed"
    );
  }, [closeWithPreference]);

  const buyCoffee = useCallback(() => {
    closeWithPreference(
      createSupportPromptSnoozePreference(new Date()),
      "paymentLinkSelected"
    );
  }, [closeWithPreference]);

  const markSupported = useCallback(() => {
    closeWithPreference(
      createSupportPromptSupportedPreference(new Date()),
      "priorSupportSelected"
    );
  }, [closeWithPreference]);

  const decline = useCallback(() => {
    closeWithPreference(
      createSupportPromptDeclinedPreference(new Date()),
      "declineSelected"
    );
  }, [closeWithPreference]);

  const reset = useCallback(() => {
    clearStoredSupportPromptPreference();
    setPreference(null);
    setIsOpen(false);
    setSessionSuppressed(false);
    setShowThankYouStatus(false);
    hasTrackedShownRef.current = false;
  }, []);

  return {
    viewModel: {
      isOpen,
      showThankYouStatus,
      dismissThankYouStatus: () => setShowThankYouStatus(false),
      buyCoffee,
      maybeLater,
      dismiss,
      markSupported,
      decline,
    } satisfies SupportPromptViewModel,
    reset,
  };
}

function isDocumentVisible() {
  return (
    typeof document === "undefined" || document.visibilityState !== "hidden"
  );
}
