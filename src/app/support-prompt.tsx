import { useEffect, useId, useRef } from "react";
import { getSupportPaymentLinkUrl } from "./support-prompt-config";
import type { SupportPromptViewModel } from "./use-support-prompt";

type SupportPromptProps = {
  prompt: SupportPromptViewModel;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function SupportPrompt({ prompt }: SupportPromptProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!prompt.isOpen) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTimer = window.setTimeout(() => {
      getFocusableElements(dialogRef.current)[0]?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      const previousFocus = previousFocusRef.current;

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [prompt.isOpen]);

  useEffect(() => {
    if (!prompt.isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        prompt.dismiss();
        return;
      }

      if (event.key === "Tab") {
        containTabFocus(event, dialogRef.current);
      }
    }

    function handleFocusIn(event: FocusEvent) {
      const dialog = dialogRef.current;

      if (!dialog || !(event.target instanceof Node)) {
        return;
      }

      if (!dialog.contains(event.target)) {
        getFocusableElements(dialog)[0]?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [prompt]);

  if (!prompt.isOpen) {
    return null;
  }

  const paymentLinkUrl = getSupportPaymentLinkUrl();

  return (
    <div
      className="app-dialog-overlay support-prompt-overlay"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="app-dialog-card support-prompt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="support-prompt-copy">
          <p className="eyebrow">Optional support</p>
          <h2 id={titleId}>Found the modeller useful?</h2>
          <div id={descriptionId} className="support-prompt-description">
            <p className="section-copy">
              I’ve spent hundreds of hours building and improving it. If it has
              helped you, you can buy me a coffee as a small thank you. The
              modeller is free to use and there’s no obligation.
            </p>
          </div>
        </div>

        {paymentLinkUrl ? (
          <a
            className="primary-button support-prompt-payment-link"
            href={paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={prompt.buyCoffee}
          >
            <svg
              className="support-prompt-payment-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              focusable="false"
            >
              <path d="M4 6h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V6Z" />
              <path d="M16 8h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M3 20h15" />
            </svg>
            Buy me a coffee
          </a>
        ) : (
          <p className="support-prompt-configuration-warning" role="status">
            The support payment link is not configured yet.
          </p>
        )}

        <p className="support-prompt-payment-note">
          Payment is handled by Stripe. The payment page opens in a new tab.
        </p>

        <div className="support-prompt-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={prompt.maybeLater}
          >
            Maybe later
          </button>
          <button
            type="button"
            className="secondary-button support-prompt-muted-button"
            onClick={prompt.markSupported}
          >
            I’ve already bought you a coffee
          </button>
          <button
            type="button"
            className="secondary-button support-prompt-muted-button"
            onClick={prompt.decline}
          >
            No thanks — don’t ask again
          </button>
        </div>
      </div>
    </div>
  );
}

export function SupportPromptThankYou({
  show,
  onDismiss,
}: {
  show: boolean;
  onDismiss: () => void;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="support-thank-you" role="status">
      <span>Thank you for supporting the modeller.</span>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function containTabFocus(event: KeyboardEvent, dialog: HTMLElement | null) {
  if (!dialog) {
    return;
  }

  const focusable = getFocusableElements(dialog);
  const first = focusable[0];
  const last = focusable.at(-1);

  if (!first || !last) {
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => !element.hasAttribute("disabled"));
}
