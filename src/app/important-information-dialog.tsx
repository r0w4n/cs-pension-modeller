import { useEffect, useId, useRef, type RefObject } from "react";

export function ImportantInformationDialog({
  onContinue,
  manageFocus = false,
  focusAfterCloseRef,
}: {
  onContinue: (analyticsConsentGranted: boolean) => void;
  manageFocus?: boolean;
  focusAfterCloseRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!manageFocus) {
      return;
    }

    const focusAfterClose = focusAfterCloseRef?.current;
    const focusTimer = window.setTimeout(() => {
      getFocusableElements(dialogRef.current)[0]?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
      } else if (event.key === "Tab") {
        containTabFocus(event, dialogRef.current);
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (
        dialog &&
        event.target instanceof Node &&
        !dialog.contains(event.target)
      ) {
        getFocusableElements(dialog)[0]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      queueMicrotask(() => focusAfterClose?.focus());
    };
  }, [focusAfterCloseRef, manageFocus]);

  return (
    <div
      ref={dialogRef}
      className="app-dialog-overlay acknowledgement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <section className="app-dialog-card acknowledgement-card">
        <p className="eyebrow">Before you continue</p>
        <h2 id={titleId}>Important information</h2>
        <p className="section-copy">
          This modeller is for planning and illustration only. It is not
          financial advice and is not affiliated with the Civil Service Pension
          Scheme, Capita, the Cabinet Office, or the Alpha Pension Scheme.
        </p>
        <p className="section-copy">
          Results depend entirely on the assumptions you enter. Check important
          decisions against your official pension statement and, where
          appropriate, a regulated financial adviser.
        </p>
        <p className="section-copy">
          Your inputs are saved locally in your browser so you can come back to
          the same assumptions later. This site can use analytics to record
          coarse interaction events only, and no financial or personal inputs
          are sent. You can accept or decline analytics now and change that
          choice later in Settings.
        </p>
        <div className="acknowledgement-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onContinue(true)}
          >
            Accept analytics and continue
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onContinue(false)}
          >
            Continue without analytics
          </button>
        </div>
      </section>
    </div>
  );
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function containTabFocus(event: KeyboardEvent, dialog: HTMLElement | null) {
  const focusable = getFocusableElements(dialog);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => !element.hasAttribute("disabled"));
}
