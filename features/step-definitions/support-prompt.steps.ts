import { DataTable, Given, Then, When } from "@cucumber/cucumber";
import {
  SUPPORT_PAYMENT_LINK_URL,
  SUPPORT_PROMPT_DECLINE_MONTHS,
  SUPPORT_PROMPT_SNOOZE_MS,
  SUPPORT_PROMPT_SUPPORTED_MONTHS,
} from "../../src/app/support-prompt-config";
import { SUPPORT_PROMPT_ANALYTICS_EVENTS } from "../../src/app/support-prompt-analytics";
import {
  createSupportPromptDeclinedPreference,
  createSupportPromptSnoozePreference,
  createSupportPromptSupportedPreference,
  hasCompletedSupportPromptDelay,
  isSupportPromptEligible,
} from "../../src/app/support-prompt-lifecycle";
import {
  clearStoredSupportPromptPreference,
  loadSupportPromptPreference,
  saveSupportPromptPreference,
  SUPPORT_PROMPT_STORAGE_KEY,
  type SupportPromptPreference,
} from "../../src/app/support-prompt-storage";
import {
  clearAllLocalStorageData,
  saveLocalStoragePreference,
} from "../../src/settings";

type MemoryStorage = Storage & {
  snapshot: () => Record<string, string>;
};

type SupportPromptWorld = {
  supportPromptEligible?: boolean;
  supportPromptPreference?: SupportPromptPreference | null;
  supportPromptEligibleSince?: number | null;
  supportPromptNowMs?: number;
  supportPromptDelayComplete?: boolean;
};

const SUPPORT_PROMPT_TEST_NOW = new Date("2026-09-12T12:00:00.000Z");

Given("the support prompt has no stored preference", function () {
  installLocalStorage();
  saveLocalStoragePreference(true);
  clearStoredSupportPromptPreference();
});

Given("support prompt local storage is available", function () {
  installLocalStorage();
  saveLocalStoragePreference(true);
});

Given(
  "support prompt local storage contains {string}",
  function (storedValue: string) {
    const storage = installLocalStorage();
    saveLocalStoragePreference(true);
    storage.setItem(SUPPORT_PROMPT_STORAGE_KEY, getStoredValue(storedValue));
  }
);

When(
  "support prompt eligibility is checked for step {string} with calculation {string} and document {string}",
  function (
    this: SupportPromptWorld,
    step: string,
    calculation: string,
    visibility: string
  ) {
    this.supportPromptEligible = isSupportPromptEligible({
      activeJourneyStep: step === "results" ? "results" : "other",
      calculationFinished: calculation !== "pending",
      retirementPlanResultAvailable: calculation !== "unavailable",
      calculationError: calculation === "failed",
      documentVisible: visibility === "visible",
      preference: loadSupportPromptPreference(),
      sessionSuppressed: false,
      now: SUPPORT_PROMPT_TEST_NOW,
    });
  }
);

When(
  "the support prompt becomes eligible",
  function (this: SupportPromptWorld) {
    this.supportPromptNowMs =
      this.supportPromptNowMs ?? SUPPORT_PROMPT_TEST_NOW.getTime();
    this.supportPromptEligibleSince = this.supportPromptNowMs;
  }
);

When(
  "the support prompt becomes ineligible",
  function (this: SupportPromptWorld) {
    this.supportPromptEligibleSince = null;
  }
);

When(
  "{int} support prompt seconds pass",
  function (this: SupportPromptWorld, seconds: number) {
    this.supportPromptNowMs =
      (this.supportPromptNowMs ?? SUPPORT_PROMPT_TEST_NOW.getTime()) +
      seconds * 1000;
    this.supportPromptDelayComplete = hasCompletedSupportPromptDelay(
      this.supportPromptEligibleSince ?? null,
      this.supportPromptNowMs
    );
  }
);

When(
  "the support prompt action {string} is saved",
  function (actionLabel: string) {
    const preference =
      actionLabel === "Maybe later" || actionLabel === "Buy me a coffee"
        ? createSupportPromptSnoozePreference(SUPPORT_PROMPT_TEST_NOW)
        : actionLabel === "I've already bought you a coffee"
          ? createSupportPromptSupportedPreference(SUPPORT_PROMPT_TEST_NOW)
          : createSupportPromptDeclinedPreference(SUPPORT_PROMPT_TEST_NOW);

    saveSupportPromptPreference(preference);
  }
);

When(
  "the stored support prompt preference is loaded",
  function (this: SupportPromptWorld) {
    this.supportPromptPreference = loadSupportPromptPreference();
  }
);

When("support prompt local saving is disabled", function () {
  saveLocalStoragePreference(false);
  clearStoredSupportPromptPreference();
});

When("stored support prompt data is cleared", function () {
  clearAllLocalStorageData();
});

Then(
  "the support prompt should be {string}",
  function (this: SupportPromptWorld, expected: string) {
    assertEqual(this.supportPromptEligible, expected === "eligible");
  }
);

Then(
  "the support prompt delay should not be complete",
  function (this: SupportPromptWorld) {
    assertEqual(this.supportPromptDelayComplete, false);
  }
);

Then(
  "the support prompt delay should be complete",
  function (this: SupportPromptWorld) {
    assertEqual(this.supportPromptDelayComplete, true);
  }
);

Then(
  "the stored support prompt preference should be {string} for {string}",
  function (
    expectedStatus: SupportPromptPreference["status"],
    expectedDuration: string
  ) {
    const preference = loadSupportPromptPreference();

    assertCondition(preference, "Expected a stored support prompt preference");
    assertEqual(preference.status, expectedStatus);
    assertEqual(
      preference.nextPromptAt,
      getExpectedNextPromptAt(expectedDuration).toISOString()
    );
  }
);

Then(
  "no stored support prompt preference should load",
  function (this: SupportPromptWorld) {
    assertEqual(
      this.supportPromptPreference ?? loadSupportPromptPreference(),
      null
    );
  }
);

Then("no raw support prompt preference should be stored", function () {
  assertEqual(readRawStorageItem(SUPPORT_PROMPT_STORAGE_KEY), null);
});

Then(
  "support prompt analytics should define these events:",
  function (dataTable: DataTable) {
    const expectedEvents = dataTable
      .hashes()
      .map((row) => row.event)
      .filter(Boolean);

    assertEqual(
      JSON.stringify(Object.values(SUPPORT_PROMPT_ANALYTICS_EVENTS)),
      JSON.stringify(expectedEvents)
    );
  }
);

Then(
  "support prompt analytics events should not contain financial or Stripe configuration values",
  function () {
    const eventNames = Object.values(SUPPORT_PROMPT_ANALYTICS_EVENTS);

    assertEqual(eventNames.length, 7);
    for (const eventName of eventNames) {
      assertCondition(!eventName.includes(SUPPORT_PAYMENT_LINK_URL));
      assertCondition(!eventName.includes("50000"));
      assertCondition(!eventName.toLowerCase().includes("stripe"));
      assertCondition(!eventName.includes("bJe00j"));
    }
  }
);

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>();
  const localStorage: MemoryStorage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values.entries());
    },
  };

  return localStorage;
}

function installLocalStorage() {
  const localStorage = createMemoryStorage();
  const testGlobal = globalThis as typeof globalThis & {
    window?: { localStorage: Storage };
  };

  Object.defineProperty(testGlobal, "window", {
    configurable: true,
    value: { localStorage },
  });

  return localStorage;
}

function getStoredValue(label: string) {
  if (label === "malformed json") {
    return "{bad json";
  }

  if (label === "snoozed without date") {
    return JSON.stringify({ status: "snoozed", nextPromptAt: null });
  }

  if (label === "supported without date") {
    return JSON.stringify({
      status: "supported",
      nextPromptAt: null,
    });
  }

  if (label === "declined without date") {
    return JSON.stringify({
      status: "declined",
      nextPromptAt: null,
    });
  }

  if (label === "unknown status") {
    return JSON.stringify({ status: "unexpected", nextPromptAt: null });
  }

  return label;
}

function readRawStorageItem(key: string) {
  const testGlobal = globalThis as typeof globalThis & {
    window?: { localStorage?: Storage };
  };

  return testGlobal.window?.localStorage?.getItem(key) ?? null;
}

function getExpectedNextPromptAt(duration: string) {
  if (duration === "1 week") {
    return new Date(
      SUPPORT_PROMPT_TEST_NOW.getTime() + SUPPORT_PROMPT_SNOOZE_MS
    );
  }

  if (duration === "1 month") {
    return addCalendarMonths(
      SUPPORT_PROMPT_TEST_NOW,
      SUPPORT_PROMPT_DECLINE_MONTHS
    );
  }

  if (duration === "6 months") {
    return addCalendarMonths(
      SUPPORT_PROMPT_TEST_NOW,
      SUPPORT_PROMPT_SUPPORTED_MONTHS
    );
  }

  throw new Error(`Unexpected support prompt duration ${duration}`);
}

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}

function assertCondition(
  condition: unknown,
  message = "Expected condition to be true"
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T) {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
    );
  }
}
