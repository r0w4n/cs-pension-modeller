import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  getFlexibleFundAccountLabel,
  getFlexibleWithdrawalNonPriorityAccounts,
  getFlexibleWithdrawalPriorityAccounts,
  getWithdrawalStrategyFieldId,
  reorderFlexibleWithdrawalAccounts,
  shouldShowFlexibleWithdrawalPriority,
} from "../app-domains";
import {
  type FlexibleFundAccountId,
  type FlexibleWithdrawalStrategy,
  type PensionSettings,
} from "../settings";
import type { SettingsFieldOnChange } from "./form-fields";

const WITHDRAWAL_STRATEGY_OPTIONS: Array<{
  value: FlexibleWithdrawalStrategy;
  label: string;
}> = [
  { value: "zero_at_death", label: "Zero at death" },
  { value: "percentage", label: "Annual percentage" },
  { value: "use_by_age", label: "Use by age" },
  { value: "meet_income_target", label: "Use to meet income target" },
];

export function FlexibleWithdrawalPriorityEditor({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  const priorityAccounts = getFlexibleWithdrawalPriorityAccounts(settings);
  const nonPriorityAccounts =
    getFlexibleWithdrawalNonPriorityAccounts(settings);
  const listRef = useRef<HTMLOListElement | null>(null);
  const activeDragRef = useRef<FlexibleFundAccountId | null>(null);
  const dragOrderRef = useRef(priorityAccounts);
  const [draggingAccount, setDraggingAccount] =
    useState<FlexibleFundAccountId | null>(null);
  const [dragPreviewOrder, setDragPreviewOrder] = useState<
    FlexibleFundAccountId[] | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const displayedPriorityAccounts = dragPreviewOrder ?? priorityAccounts;

  if (!activeDragRef.current) {
    dragOrderRef.current = priorityAccounts;
  }

  if (!shouldShowFlexibleWithdrawalPriority(settings)) {
    return null;
  }

  function savePriorityOrder(reorderedAccounts: FlexibleFundAccountId[]) {
    const remainingAccounts = settings.flexibleWithdrawalPriority.filter(
      (candidate) => !reorderedAccounts.includes(candidate)
    );

    onChange("flexibleWithdrawalPriority", [
      ...reorderedAccounts,
      ...remainingAccounts,
    ]);
  }

  function announcePosition(
    accountId: FlexibleFundAccountId,
    order: FlexibleFundAccountId[]
  ) {
    const position = order.indexOf(accountId) + 1;
    setAnnouncement(
      `${getFlexibleFundAccountLabel(accountId)} moved to priority ${position} of ${order.length}.`
    );
  }

  function beginDrag(accountId: FlexibleFundAccountId) {
    activeDragRef.current = accountId;
    dragOrderRef.current = priorityAccounts;
    setDragPreviewOrder(priorityAccounts);
    setDraggingAccount(accountId);
    setAnnouncement(
      `${getFlexibleFundAccountLabel(accountId)} picked up at priority ${priorityAccounts.indexOf(accountId) + 1} of ${priorityAccounts.length}.`
    );
  }

  function finishDrag(saveChanges: boolean) {
    const accountId = activeDragRef.current;

    if (!accountId) {
      return;
    }

    activeDragRef.current = null;
    setDraggingAccount(null);
    setDragPreviewOrder(null);

    if (saveChanges) {
      if (!haveSameOrder(priorityAccounts, dragOrderRef.current)) {
        savePriorityOrder(dragOrderRef.current);
      }
      announcePosition(accountId, dragOrderRef.current);
      return;
    }

    setAnnouncement(
      `${getFlexibleFundAccountLabel(accountId)} reorder cancelled.`
    );
  }

  function previewOrder(nextOrder: FlexibleFundAccountId[]) {
    const previousOrder = dragOrderRef.current;

    if (nextOrder !== previousOrder) {
      dragOrderRef.current = nextOrder;
      setDragPreviewOrder(nextOrder);
      const accountId = activeDragRef.current;
      if (accountId) {
        announcePosition(accountId, nextOrder);
      }
    }
  }

  function handleNativeDragStart(
    event: DragEvent<HTMLButtonElement>,
    accountId: FlexibleFundAccountId
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", accountId);
    const row = event.currentTarget.closest("li");
    if (row) {
      event.dataTransfer.setDragImage(row, 24, row.clientHeight / 2);
    }
    beginDrag(accountId);
  }

  function handleNativeDragOver(
    event: DragEvent<HTMLLIElement>,
    targetAccountId: FlexibleFundAccountId
  ) {
    const accountId = activeDragRef.current;

    if (!accountId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (accountId === targetAccountId) {
      return;
    }

    const withoutDraggedAccount = dragOrderRef.current.filter(
      (candidate) => candidate !== accountId
    );
    const targetIndex = withoutDraggedAccount.indexOf(targetAccountId);
    if (targetIndex < 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfterTarget = event.clientY > bounds.top + bounds.height / 2;
    const nextOrder = [...withoutDraggedAccount];
    nextOrder.splice(targetIndex + (insertAfterTarget ? 1 : 0), 0, accountId);
    previewOrder(nextOrder);
  }

  function handleNativeDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    finishDrag(true);
  }

  function handleNativeDragEnd() {
    finishDrag(false);
  }

  function handlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    accountId: FlexibleFundAccountId
  ) {
    if (event.pointerType === "mouse") {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginDrag(accountId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      return;
    }

    const accountId = activeDragRef.current;
    const list = listRef.current;

    if (!accountId || !list) {
      return;
    }

    event.preventDefault();
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>("[data-priority-account]")
    );
    const nextIndex = rows.findIndex((row) => {
      const bounds = row.getBoundingClientRect();
      return event.clientY <= bounds.top + bounds.height / 2;
    });
    const nextPosition = nextIndex < 0 ? rows.length : nextIndex + 1;
    const nextOrder = reorderFlexibleWithdrawalAccounts(
      dragOrderRef.current,
      accountId,
      nextPosition
    );
    previewOrder(nextOrder);
  }

  function finishPointerDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" || !activeDragRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(true);
  }

  function cancelPointerDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" || !activeDragRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(false);
  }

  function handleReorderKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    accountId: FlexibleFundAccountId
  ) {
    const currentIndex = priorityAccounts.indexOf(accountId);
    const nextPosition =
      event.key === "ArrowUp"
        ? currentIndex
        : event.key === "ArrowDown"
          ? currentIndex + 2
          : event.key === "Home"
            ? 1
            : event.key === "End"
              ? priorityAccounts.length
              : null;

    if (nextPosition === null) {
      return;
    }

    event.preventDefault();
    const nextOrder = reorderFlexibleWithdrawalAccounts(
      priorityAccounts,
      accountId,
      nextPosition
    );
    if (nextOrder !== priorityAccounts) {
      savePriorityOrder(nextOrder);
    }
    announcePosition(accountId, nextOrder);
  }

  return (
    <section
      className="field-card flexible-withdrawal-priority"
      aria-labelledby="flexible-withdrawal-priority-title"
    >
      <div className="field-header">
        <h4 id="flexible-withdrawal-priority-title">
          Income-target funding priority
        </h4>
      </div>
      <p className="field-help">
        Priority applies to accounts using “Use to meet income target”. Other
        withdrawal strategies keep their own instructions until you change them.
      </p>
      {priorityAccounts.length > 0 ? (
        <>
          <h5>Use to meet income target</h5>
          <p
            id="flexible-withdrawal-priority-instructions"
            className="field-help"
          >
            Drag accounts into order. With a keyboard, focus a drag handle and
            use the arrow keys, Home or End.
          </p>
          <ol ref={listRef} className="flexible-withdrawal-priority-list">
            {displayedPriorityAccounts.map((accountId, index) => {
              const accountLabel = getFlexibleFundAccountLabel(accountId);

              return (
                <li
                  key={accountId}
                  data-priority-account={accountId}
                  onDragOver={(event) => handleNativeDragOver(event, accountId)}
                  onDrop={handleNativeDrop}
                  className={
                    draggingAccount === accountId
                      ? "flexible-withdrawal-priority-item--dragging"
                      : undefined
                  }
                >
                  <span className="flexible-withdrawal-priority-account">
                    <strong aria-hidden="true">{index + 1}</strong>
                    {accountLabel}
                  </span>
                  <span className="flexible-withdrawal-priority-controls">
                    <WithdrawalStrategyControl
                      accountId={accountId}
                      settings={settings}
                      onChange={onChange}
                    />
                    <button
                      type="button"
                      className="flexible-withdrawal-drag-handle"
                      aria-label={`Reorder ${accountLabel}. Priority ${index + 1} of ${displayedPriorityAccounts.length}.`}
                      aria-describedby="flexible-withdrawal-priority-instructions"
                      disabled={displayedPriorityAccounts.length < 2}
                      draggable={displayedPriorityAccounts.length >= 2}
                      onDragStart={(event) =>
                        handleNativeDragStart(event, accountId)
                      }
                      onDragEnd={handleNativeDragEnd}
                      onPointerDown={(event) =>
                        handlePointerDown(event, accountId)
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishPointerDrag}
                      onPointerCancel={cancelPointerDrag}
                      onKeyDown={(event) =>
                        handleReorderKeyDown(event, accountId)
                      }
                    >
                      <span aria-hidden="true">⠿</span>
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        nonPriorityAccounts.length > 0 && (
          <p className="field-help">
            No account currently uses “Use to meet income target”.
          </p>
        )
      )}
      {nonPriorityAccounts.length > 0 ? (
        <section
          className="flexible-withdrawal-other-strategies"
          aria-labelledby="flexible-withdrawal-other-strategies-title"
        >
          <h5 id="flexible-withdrawal-other-strategies-title">
            Other withdrawal strategies
          </h5>
          <p className="field-help">
            These accounts are not part of the draggable funding priority.
            Change one to “Use to meet income target” to add it above.
          </p>
          <ul className="flexible-withdrawal-priority-list">
            {nonPriorityAccounts.map((accountId) => (
              <li key={accountId} data-other-account={accountId}>
                <span className="flexible-withdrawal-priority-account">
                  {getFlexibleFundAccountLabel(accountId)}
                </span>
                <span className="flexible-withdrawal-priority-controls">
                  <WithdrawalStrategyControl
                    accountId={accountId}
                    settings={settings}
                    onChange={onChange}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {priorityAccounts.length === 0 && nonPriorityAccounts.length === 0 ? (
        <p className="field-help">
          Include a SIPP, Civil Service AVC, LISA or ISA to set its withdrawal
          strategy and funding priority here.
        </p>
      ) : null}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}

function WithdrawalStrategyControl({
  accountId,
  settings,
  onChange,
}: {
  accountId: FlexibleFundAccountId;
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  const accountLabel = getFlexibleFundAccountLabel(accountId);
  const strategyFieldId = getWithdrawalStrategyFieldId(accountId);

  return (
    <label className="flexible-withdrawal-strategy-control">
      <span>Withdrawal strategy</span>
      <select
        className="select-input"
        aria-label={`${accountLabel} withdrawal strategy`}
        value={settings[strategyFieldId]}
        onChange={(event) =>
          onChange(
            strategyFieldId,
            event.target.value as FlexibleWithdrawalStrategy
          )
        }
      >
        {WITHDRAWAL_STRATEGY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function haveSameOrder(
  first: FlexibleFundAccountId[],
  second: FlexibleFundAccountId[]
) {
  return (
    first.length === second.length &&
    first.every((accountId, index) => accountId === second[index])
  );
}
