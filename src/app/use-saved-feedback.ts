import { useEffect, useRef, useState } from "react";
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

  function showSavedLabel() {
    showSavedLabelAction({
      savedFeedbackTimerRef,
      setShowSavedFeedback,
    });
  }

  return {
    savedFeedbackTimerRef,
    setShowSavedFeedback,
    showSavedFeedback,
    showSavedLabel,
  };
}
