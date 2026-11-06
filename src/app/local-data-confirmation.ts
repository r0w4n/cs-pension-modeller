export type LocalDataAction = "clear-all" | "disable-saving";

export type LocalDataConfirmationEvent =
  | { type: "request"; action: LocalDataAction }
  | { type: "cancel" }
  | { type: "confirm" };

export function resolveLocalDataConfirmation(
  pendingAction: LocalDataAction | null,
  event: LocalDataConfirmationEvent
): {
  pendingAction: LocalDataAction | null;
  confirmedAction: LocalDataAction | null;
} {
  if (event.type === "request") {
    return { pendingAction: event.action, confirmedAction: null };
  }
  return {
    pendingAction: null,
    confirmedAction: event.type === "confirm" ? pendingAction : null,
  };
}
