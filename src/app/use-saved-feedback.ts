import { useCallback, useEffect, useRef, useState } from "react";
import { showSavedLabel as showSavedLabelAction } from "./app-actions";

export function useSavedFeedback() {
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const savedFeedbackTimerRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (savedFeedbackTimerRef.current) {
        window.clearTimeout(savedFeedbackTimerRef.current);
        savedFeedbackTimerRef.current = null;
      }
    };
  }, []);

  const showSavedLabel = useCallback(() => {
    showSavedLabelAction({
      savedFeedbackTimerRef,
      setShowSavedFeedback,
    });
  }, []);

  const hideSavedLabel = useCallback(() => {
    if (savedFeedbackTimerRef.current) {
      window.clearTimeout(savedFeedbackTimerRef.current);
      savedFeedbackTimerRef.current = null;
    }
    setShowSavedFeedback(false);
  }, []);

  return {
    savedFeedbackTimerRef,
    setShowSavedFeedback,
    showSavedFeedback,
    showSavedLabel,
    hideSavedLabel,
  };
}
