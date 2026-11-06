import { useEffect, useId, useRef } from "react";
import type { LocalDataAction } from "./local-data-confirmation";

export function ClearDataDialog({
  onCancel,
  onConfirm,
  action = "clear-all",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  action?: LocalDataAction;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => dialog?.close();
  }, []);

  function cancel() {
    dialogRef.current?.close();
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog-overlay"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        if (event.shiftKey && document.activeElement === cancelRef.current) {
          event.preventDefault();
          confirmRef.current?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === confirmRef.current
        ) {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }}
    >
      <section className="app-dialog-card">
        <h2 id={titleId}>
          {action === "disable-saving"
            ? "Turn off local saving and delete saved data?"
            : "Clear all data from this browser?"}
        </h2>
        <p id={descriptionId} className="section-copy">
          {action === "disable-saving" ? (
            <>
              This removes saved journey inputs, Quick inputs, comparison
              scenarios and preferences from this browser. Quick inputs on this
              open page will also be reset. Local saving and analytics will be
              turned off. This cannot be undone. Export your parameters first if
              you need a copy; exports exclude Quick inputs and saved
              comparisons.
            </>
          ) : (
            <>
              This removes all saved inputs, Quick inputs, comparison scenarios
              and preferences, and resets this open page. Local saving and
              analytics will be turned off. This cannot be undone. Export your
              parameters first if you need a copy; exports exclude Quick inputs
              and saved comparisons.
            </>
          )}
        </p>
        <div className="acknowledgement-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary-button"
            onClick={cancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button settings-reset-button"
            ref={confirmRef}
            onClick={() => {
              dialogRef.current?.close();
              onConfirm();
            }}
          >
            {action === "disable-saving"
              ? "Turn off saving and delete saved data"
              : "Delete all data"}
          </button>
        </div>
      </section>
    </dialog>
  );
}
