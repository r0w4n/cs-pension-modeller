import { When, Then } from "@cucumber/cucumber";
import { disableLocalSavingAndClearStoredData } from "../../src/app/app-actions";
import {
  resolveLocalDataConfirmation,
  type LocalDataAction,
  type LocalDataConfirmationEvent,
} from "../../src/app/local-data-confirmation";
import { isLocalStorageEnabled } from "../../src/settings";

type ConfirmationWorld = {
  pendingLocalDataAction?: LocalDataAction | null;
  storageBeforeConfirmation?: string;
};

function storedDataSnapshot() {
  const storage = window.localStorage;
  return JSON.stringify(
    Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null)
      .sort()
      .map((key) => [key, storage.getItem(key)])
  );
}

function dispatchConfirmation(
  world: ConfirmationWorld,
  event: LocalDataConfirmationEvent
) {
  const result = resolveLocalDataConfirmation(
    world.pendingLocalDataAction ?? null,
    event
  );
  world.pendingLocalDataAction = result.pendingAction;
  if (result.confirmedAction === "disable-saving")
    disableLocalSavingAndClearStoredData();
}

function assertPreserved(world: ConfirmationWorld) {
  if (
    !isLocalStorageEnabled() ||
    storedDataSnapshot() !== world.storageBeforeConfirmation
  ) {
    throw new Error(
      "Expected saving to remain on and populated storage to remain unchanged"
    );
  }
}

When(
  "turning local saving off is requested in Settings",
  function (this: ConfirmationWorld) {
    this.storageBeforeConfirmation = storedDataSnapshot();
    dispatchConfirmation(this, { type: "request", action: "disable-saving" });
  }
);
Then(
  "the request should await confirmation without changing saved data",
  function (this: ConfirmationWorld) {
    if (this.pendingLocalDataAction !== "disable-saving")
      throw new Error("Expected a pending confirmation");
    assertPreserved(this);
  }
);
When(
  "the local data confirmation is cancelled",
  function (this: ConfirmationWorld) {
    dispatchConfirmation(this, { type: "cancel" });
  }
);
Then(
  "local saving and the populated data should be preserved",
  function (this: ConfirmationWorld) {
    if (this.pendingLocalDataAction !== null)
      throw new Error("Expected the confirmation to close");
    assertPreserved(this);
  }
);
When(
  "turning local saving off is confirmed",
  function (this: ConfirmationWorld) {
    dispatchConfirmation(this, { type: "confirm" });
  }
);
