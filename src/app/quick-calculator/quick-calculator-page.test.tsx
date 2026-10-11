import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runQuickCalculatorScenarios } from "../../calculation/quick-calculator-scenarios";
import {
  createDefaultSettings,
  LOCAL_STORAGE_ENABLED_KEY,
  saveLocalStoragePreference,
} from "../../settings";
import { disableLocalSavingAndClearStoredData } from "../app-actions";
import {
  QUICK_CALCULATOR_STORAGE_KEY,
  loadQuickCalculatorState,
  saveQuickCalculatorState,
  type QuickCalculatorStoredInputs,
} from "./quick-calculator-storage";
import type {
  QuickCalculatorWorkerRequest,
  QuickCalculatorWorkerResponse,
} from "./quick-calculator-worker";
import {
  QuickCalculatorAssumptions,
  QuickCalculatorPage,
} from "./quick-calculator-page";

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  request: QuickCalculatorWorkerRequest | undefined;
  terminated = false;
  private messageListeners = new Set<
    (event: MessageEvent<QuickCalculatorWorkerResponse>) => void
  >();
  private errorListeners = new Set<(event: Event) => void>();

  constructor() {
    ControlledWorker.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.add(listener);
    } else if (type === "error") {
      this.errorListeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.delete(listener);
    } else if (type === "error") {
      this.errorListeners.delete(listener);
    }
  }

  postMessage(request: QuickCalculatorWorkerRequest) {
    this.request = request;
  }

  terminate() {
    this.terminated = true;
  }

  respond() {
    if (!this.request) throw new Error("Worker request missing");
    const response: QuickCalculatorWorkerResponse = {
      ok: true,
      requestId: this.request.requestId,
      settingsSignature: this.request.settingsSignature,
      result: runQuickCalculatorScenarios({
        baseSettings: this.request.baseSettings,
        calculationDate: this.request.calculationDate,
        settingsSignature: this.request.settingsSignature,
      }),
    };
    for (const listener of this.messageListeners) {
      listener(new MessageEvent("message", { data: response }));
    }
  }

  fail() {
    for (const listener of this.errorListeners) listener(new Event("error"));
  }
}

function saveCompleteQuickState(
  overrides: Partial<QuickCalculatorStoredInputs> = {},
  completionOverrides: Partial<
    Parameters<typeof saveQuickCalculatorState>[0]["completion"]
  > = {}
) {
  const defaults = createDefaultSettings();
  saveQuickCalculatorState({
    inputs: {
      dateOfBirth: "1987-06-01",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 5_000,
      pensionableEarnings: 42_000,
      alphaPensionDrawAge: 60,
      alphaHasProtectedPensionAge: false,
      alphaAddedPensionMonthly: 200,
      alphaAddedPensionFactorType: "self",
      partialRetirementStartAge: 55,
      partialRetirementWorkPercent: 50,
      showStatePension: true,
      currentStatePension: defaults.currentStatePension,
      statePensionForecastConfirmed: false,
      alphaEpaEnabled: false,
      alphaEpaPeriods: [],
      ...overrides,
    },
    completion: {
      dateOfBirth: true,
      accruedPensionAtLastAbs: true,
      pensionableEarnings: true,
      retirementAgeInitialised: true,
      partialRetirementAgeInitialised: true,
      ...completionOverrides,
    },
  });
}

async function latestWorker() {
  await waitFor(() =>
    expect(ControlledWorker.instances.length).toBeGreaterThan(0)
  );
  const worker = ControlledWorker.instances.at(-1);
  if (!worker) throw new Error("Worker was not created");
  await waitFor(() => expect(worker.request).toBeDefined());
  return worker;
}

describe("QuickCalculatorPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("cs-pension-modeller.acknowledgement", "v1");
    ControlledWorker.instances = [];
    vi.stubGlobal("Worker", ControlledWorker);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts with usable financial assumptions and waits only for birth month", () => {
    render(<QuickCalculatorPage />);

    expect(
      screen.getByRole("heading", { name: "Quick Alpha calculator" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(0);
    expect(
      screen.getByLabelText("Pensionable earnings (£ per year) exact value")
    ).toHaveValue(40_000);
    expect(
      screen.getByLabelText("Selected retirement age exact value")
    ).toHaveValue(57);
    expect(
      screen.getByLabelText("Reduce working hours from age exact value")
    ).toHaveValue(55);
    expect(
      screen.getByLabelText(
        "Working percentage after reducing hours (%) exact value"
      )
    ).toHaveValue(50);
    expect(screen.getByLabelText("Statement year")).toHaveValue(
      createDefaultSettings().alphaPensionAbsDate
    );
    expect(
      screen.getByText(
        /Enter your birth month and year to see current estimates/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter your birth month and year. The starting assumptions are £0 annual Alpha pension and £40,000 pensionable earnings; replace these with your own figures."
      )
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Settings" })[0]
    ).toHaveAttribute("href", "./settings/");
    expect(
      screen.queryByRole("button", { name: "Reset quick calculator" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Planning and illustration only/)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });
    expect(
      window.localStorage.getItem("cs-pension-quick-calculator")
    ).toBeNull();
  });

  it("initialises untouched ages from the first valid birth month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00"));
    try {
      render(<QuickCalculatorPage />);

      fireEvent.change(screen.getByLabelText("Birth month and year month"), {
        target: { value: "06" },
      });
      fireEvent.change(screen.getByLabelText("Birth month and year year"), {
        target: { value: "1960" },
      });

      expect(
        screen.getByLabelText("Selected retirement age exact value")
      ).toHaveValue(66.5);
      expect(
        screen.getByLabelText("Reduce working hours from age exact value")
      ).toHaveValue(66.5);
      expect(ControlledWorker.instances).toHaveLength(1);

      const selectedAge = screen.getByLabelText(
        "Selected retirement age exact value"
      );
      const reducedHoursAge = screen.getByLabelText(
        "Reduce working hours from age exact value"
      );
      fireEvent.change(selectedAge, { target: { value: "69" } });
      fireEvent.keyDown(selectedAge, { key: "Enter" });
      fireEvent.change(reducedHoursAge, { target: { value: "69" } });
      fireEvent.keyDown(reducedHoursAge, { key: "Enter" });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Reset Selected retirement age to default value",
        })
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: "Reset Reduce working hours from age to default value",
        })
      );
      expect(selectedAge).toHaveValue(66.5);
      expect(reducedHoursAge).toHaveValue(66.5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses age 57 and 55 defaults for June 1986 and runs all eight canonical variants", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00"));
    try {
      render(<QuickCalculatorPage />);
      fireEvent.change(screen.getByLabelText("Birth month and year month"), {
        target: { value: "06" },
      });
      fireEvent.change(screen.getByLabelText("Birth month and year year"), {
        target: { value: "1986" },
      });

      expect(
        screen.getByLabelText("Selected retirement age exact value")
      ).toHaveValue(57);
      expect(
        screen.getByLabelText("Reduce working hours from age exact value")
      ).toHaveValue(55);
      const worker = ControlledWorker.instances.at(-1)!;
      act(() => worker.respond());
      expect(screen.getAllByRole("article")).toHaveLength(8);
      expect(worker.request?.baseSettings.accruedPensionAtLastAbs).toBe(0);
      expect(worker.request?.baseSettings.pensionableEarnings).toBe(40_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves explicitly chosen ages when a birth month is entered later", () => {
    render(<QuickCalculatorPage />);
    const selectedAge = screen.getByLabelText(
      "Selected retirement age exact value"
    );
    const reducedHoursAge = screen.getByLabelText(
      "Reduce working hours from age exact value"
    );
    fireEvent.change(selectedAge, { target: { value: "59" } });
    fireEvent.keyDown(selectedAge, { key: "Enter" });
    fireEvent.change(reducedHoursAge, { target: { value: "58" } });
    fireEvent.keyDown(reducedHoursAge, { key: "Enter" });

    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });
    fireEvent.change(screen.getByLabelText("Birth month and year year"), {
      target: { value: "1987" },
    });

    expect(selectedAge).toHaveValue(59);
    expect(reducedHoursAge).toHaveValue(58);
  });

  it("reports when no prospective default age fits instead of clamping into the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00"));
    try {
      render(<QuickCalculatorPage />);
      fireEvent.change(screen.getByLabelText("Birth month and year month"), {
        target: { value: "06" },
      });
      fireEvent.change(screen.getByLabelText("Birth month and year year"), {
        target: { value: "1950" },
      });

      expect(
        screen.getByText(
          /future retirement ages inside the supported maximum age of 70/
        )
      ).toBeVisible();
      expect(
        screen.getByLabelText("Selected retirement age exact value")
      ).toHaveValue(57);
      expect(ControlledWorker.instances).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets saved values and incomplete completion flags win over fresh defaults", () => {
    saveCompleteQuickState(
      {
        accruedPensionAtLastAbs: 12_345,
        pensionableEarnings: 67_890,
        alphaPensionDrawAge: 61,
      },
      {
        accruedPensionAtLastAbs: false,
        pensionableEarnings: false,
      }
    );

    render(<QuickCalculatorPage />);

    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(null);
    expect(
      screen.getByLabelText("Pensionable earnings (£ per year) exact value")
    ).toHaveValue(null);
    expect(
      screen.getByLabelText("Selected retirement age exact value")
    ).toHaveValue(61);
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
  });

  it("allows a confirmed protected Alpha age of 55 in the quick calculator", () => {
    saveCompleteQuickState({
      dateOfBirth: "1977-05-01",
      alphaPensionDrawAge: 55,
      alphaHasProtectedPensionAge: true,
    });

    render(<QuickCalculatorPage />);

    expect(
      screen.getByRole("checkbox", {
        name: "I have confirmed Alpha access from age 55",
      })
    ).toBeChecked();
    expect(
      screen.getByLabelText("Selected retirement age exact value")
    ).toHaveValue(55);
    expect(screen.getByLabelText("Selected retirement age")).toHaveAttribute(
      "min",
      "55"
    );

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I have confirmed Alpha access from age 55",
      })
    );
    expect(
      screen.getByLabelText("Selected retirement age exact value")
    ).toHaveValue(57);
  });

  it("uses quick defaults for field reset controls", () => {
    render(<QuickCalculatorPage />);
    const earnings = screen.getByLabelText(
      "Pensionable earnings (£ per year) exact value"
    );
    const workPercent = screen.getByLabelText(
      "Working percentage after reducing hours (%) exact value"
    );
    fireEvent.change(earnings, { target: { value: "55000" } });
    fireEvent.blur(earnings);
    fireEvent.change(workPercent, { target: { value: "80" } });
    fireEvent.keyDown(workPercent, { key: "Enter" });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Pensionable earnings (£ per year) to default value",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Working percentage after reducing hours (%) to default value",
      })
    );

    expect(earnings).toHaveValue(40_000);
    expect(workPercent).toHaveValue(50);
  });

  it("does not save an invalid amount draft and accepts explicit zero again", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const worker = await latestWorker();
    act(() => worker.respond());
    const stored = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );

    fireEvent.change(accrued, { target: { value: "" } });
    fireEvent.blur(accrued);
    expect(accrued).toHaveValue(null);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      screen.getByText(
        "Enter a valid annual Alpha pension from your statement to see estimates."
      )
    ).toBeVisible();
    expect(
      screen.queryByText(
        /Enter your birth month and year to see current estimates/
      )
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      stored
    );
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    fireEvent.change(accrued, { target: { value: "0" } });
    fireEvent.blur(accrued);
    await waitFor(() =>
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: { inputs: { accruedPensionAtLastAbs: 0 } },
      })
    );
    expect(screen.getByText("Saved Locally")).toBeVisible();
  });

  it("shows shared save feedback only after writes and renews its duration", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00"));
    try {
      render(<QuickCalculatorPage />);
      expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Birth month and year month"), {
        target: { value: "06" },
      });
      fireEvent.change(screen.getByLabelText("Birth month and year year"), {
        target: { value: "1987" },
      });
      expect(screen.getByText("Saved Locally")).toBeVisible();
      act(() => {
        vi.advanceTimersByTime(1_000);
      });

      const addedPension = screen.getByLabelText(
        "Monthly Added Pension payment (£ per month) exact value"
      );
      fireEvent.change(addedPension, { target: { value: "25" } });
      fireEvent.blur(addedPension);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByText("Saved Locally")).toBeVisible();
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("explains malformed storage without showing saved feedback", () => {
    window.localStorage.setItem(QUICK_CALCULATOR_STORAGE_KEY, "not-json");
    render(<QuickCalculatorPage />);

    expect(
      screen.getByText(
        /could not be loaded. Valid new entries can replace it when saving is enabled; manage saved data in Settings/
      )
    ).toBeVisible();
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
  });

  it("cancels pending saved feedback when quick data is cleared externally", () => {
    render(<QuickCalculatorPage />);
    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });
    fireEvent.change(screen.getByLabelText("Birth month and year year"), {
      target: { value: "1987" },
    });
    expect(screen.getByText("Saved Locally")).toBeVisible();

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    window.localStorage.removeItem(QUICK_CALCULATOR_STORAGE_KEY);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue: null,
        })
      );
    });

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Birth month and year month")).toHaveValue("");
    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(0);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("shows shared advanced controls in the State Pension and EPA disclosure", () => {
    render(<QuickCalculatorPage />);

    fireEvent.click(screen.getByText("State Pension and EPA"));
    expect(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    ).toBeChecked();
    expect(
      screen.getByLabelText("State Pension forecast (£ per year)")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("This is my personalised State Pension forecast")
    ).not.toBeChecked();
    expect(screen.getByLabelText("Add EPA")).not.toBeChecked();
  });

  it("shows the exact derived State Pension date used by the worker", async () => {
    saveCompleteQuickState({ dateOfBirth: "1977-05-01" });
    render(<QuickCalculatorPage />);
    const worker = await latestWorker();

    fireEvent.click(screen.getByText("State Pension and EPA"));
    expect(
      screen.getByText(/Derived State Pension start date: 6 May 2044/)
    ).toBeVisible();
    expect(worker.request?.baseSettings.statePensionDrawDate).toBe(
      "2044-05-06"
    );
  });

  it("shows the inflation assumption supplied to the worker before inputs are complete", async () => {
    render(<QuickCalculatorPage />);
    fireEvent.click(screen.getByText("Assumptions used"));
    expect(
      screen.getByText(/annual inflation assumption of 2.5%/)
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });
    fireEvent.change(screen.getByLabelText("Birth month and year year"), {
      target: { value: "1987" },
    });
    fireEvent.change(
      screen.getByLabelText("Alpha pension on your statement (£ per year)"),
      { target: { value: "5000" } }
    );
    fireEvent.blur(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    );
    fireEvent.change(
      screen.getByLabelText("Pensionable earnings (£ per year) exact value"),
      { target: { value: "42000" } }
    );
    fireEvent.blur(
      screen.getByLabelText("Pensionable earnings (£ per year) exact value")
    );
    const worker = await latestWorker();
    expect(worker.request?.baseSettings.inflationRateAnnual).toBe(2.5);
  });

  it("formats a fractional controlled inflation assumption from its supplied source", () => {
    render(<QuickCalculatorAssumptions inflationRateAnnual={3.75} />);
    fireEvent.click(screen.getByText("Assumptions used"));
    expect(
      screen.getByText(/annual inflation assumption of 3.75%/)
    ).toBeVisible();
  });

  it("shows an applicable Added Pension coverage limitation on the result card", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00"));
    try {
      saveCompleteQuickState({
        dateOfBirth: "1957-06-01",
        alphaPensionAbsDate: "2026",
        alphaPensionDrawAge: 70,
        alphaAddedPensionMonthly: 200,
        alphaAddedPensionFactorType: "self",
        partialRetirementStartAge: 70,
      });
      render(<QuickCalculatorPage />);
      const worker = ControlledWorker.instances.at(-1)!;
      act(() => worker.respond());

      expect(
        screen.getAllByText(/excludes all regular Added Pension payments/)
      ).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the acknowledgement modal focused and the quick page inert", async () => {
    window.localStorage.removeItem("cs-pension-modeller.acknowledgement");
    render(<QuickCalculatorPage />);
    const dialog = screen.getByRole("dialog", {
      name: "Important information",
    });
    const accept = screen.getByRole("button", {
      name: "Accept analytics and continue",
    });
    const decline = screen.getByRole("button", {
      name: "Continue without analytics",
    });
    const main = screen.getByRole("main", { hidden: true });

    await waitFor(() => expect(accept).toHaveFocus());
    expect(main).toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(decline).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(accept).toHaveFocus();
    screen.getByRole("link", { name: "View estimates", hidden: true }).focus();
    expect(accept).toHaveFocus();

    fireEvent.click(decline);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Quick Alpha calculator" })
      ).toHaveFocus()
    );
    expect(dialog).not.toBeInTheDocument();
    expect(main).not.toHaveAttribute("inert");
    expect(
      window.localStorage.getItem("cs-pension-modeller.analyticsConsent")
    ).toBe("false");
  });

  it("suppresses stale and invalid estimates until the latest worker reply is current", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const first = await latestWorker();
    const addedPension = screen.getByLabelText(
      "Monthly Added Pension payment (£ per month) exact value"
    );

    fireEvent.change(addedPension, { target: { value: "300" } });
    await waitFor(() => expect(first.terminated).toBe(true));
    act(() => first.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.blur(addedPension);
    const second = await latestWorker();
    fireEvent.change(addedPension, { target: { value: "400" } });
    fireEvent.blur(addedPension);
    const third = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => second.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    act(() => third.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    const retirementAge = screen.getByLabelText(
      "Selected retirement age exact value"
    );
    fireEvent.change(retirementAge, { target: { value: "60.2" } });
    fireEvent.keyDown(retirementAge, { key: "Enter" });
    expect(
      screen.getByText("Use whole years or 3, 6 or 9 months.")
    ).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.change(retirementAge, { target: { value: "60.25" } });
    fireEvent.keyDown(retirementAge, { key: "Enter" });
    const corrected = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(4);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => corrected.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
  });

  it("shows worker failure, retries, and terminates active work on unmount", async () => {
    saveCompleteQuickState();
    const view = render(<QuickCalculatorPage />);
    const failed = await latestWorker();
    act(() => failed.fail());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The estimates could not be calculated"
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retry = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBe(2);
      return ControlledWorker.instances[1];
    });
    act(() => retry.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    view.unmount();
    expect(retry.terminated).toBe(true);
  });

  it("applies an external quick reset even while a local draft is invalid", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const pending = await latestWorker();
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );
    fireEvent.change(accrued, { target: { value: "" } });
    fireEvent.blur(accrued);
    expect(accrued).toHaveValue(null);

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    window.localStorage.removeItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue: null,
        })
      );
    });

    expect(screen.getByText(/reset in another open tab/)).toBeVisible();
    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(0);
    expect(
      screen.getByText(
        /Enter your birth month and year to see current estimates/
      )
    ).toBeVisible();
    expect(pending.terminated).toBe(true);
    act(() => pending.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("validates raw EPA dates and restores their errors after re-enabling EPA", async () => {
    saveCompleteQuickState({
      alphaEpaEnabled: true,
      alphaEpaPeriods: [
        {
          id: "epa-one",
          yearsBeforeNpa: 1,
          startDate: "2030-04-01",
          endDate: "2031-03-31",
        },
      ],
    });
    render(<QuickCalculatorPage />);
    const validStoredSnapshot = window.localStorage.getItem(
      QUICK_CALCULATOR_STORAGE_KEY
    );
    const initial = await latestWorker();
    act(() => initial.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    fireEvent.click(screen.getByText("State Pension and EPA"));
    const startDate = screen.getByLabelText("EPA start date 1");
    fireEvent.change(startDate, { target: { value: "" } });
    expect(screen.getByText("Enter a valid EPA start date.")).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      screen.getByText(/Current changes have not been saved/)
    ).toBeVisible();
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      validStoredSnapshot
    );
    expect(loadQuickCalculatorState().status).toBe("loaded");

    fireEvent.click(screen.getByLabelText("Add EPA"));
    const disabledWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(2);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => disabledWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    fireEvent.change(
      screen.getByLabelText(
        "Monthly Added Pension payment (£ per month) exact value"
      ),
      { target: { value: "300" } }
    );
    fireEvent.blur(
      screen.getByLabelText(
        "Monthly Added Pension payment (£ per month) exact value"
      )
    );
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      validStoredSnapshot
    );

    fireEvent.click(screen.getByLabelText("Add EPA"));
    expect(screen.getByText("Enter a valid EPA start date.")).toBeVisible();
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
    fireEvent.change(screen.getByLabelText("EPA start date 1"), {
      target: { value: "2030-04-01" },
    });
    await waitFor(() => {
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: {
          inputs: {
            alphaAddedPensionMonthly: 300,
            alphaEpaPeriods: [{ startDate: "2030-04-01" }],
          },
        },
      });
    });
    const correctedWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => correctedWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    const endDate = screen.getByLabelText("EPA end date 1");
    const validSnapshotBeforeEndDraft = window.localStorage.getItem(
      QUICK_CALCULATOR_STORAGE_KEY
    );
    fireEvent.change(endDate, { target: { value: "" } });
    expect(screen.getByText("Enter a valid EPA end date.")).toBeVisible();
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      validSnapshotBeforeEndDraft
    );
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
  });

  it("persists post-reset edits when another tab re-enables local saving", async () => {
    saveCompleteQuickState({ accruedPensionAtLastAbs: 8_750 });
    render(<QuickCalculatorPage />);
    await latestWorker();

    window.localStorage.removeItem(QUICK_CALCULATOR_STORAGE_KEY);
    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "false");
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "true",
          newValue: "false",
        })
      );
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue without analytics" })
    );
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );
    fireEvent.change(accrued, { target: { value: "321" } });
    fireEvent.blur(accrued);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();

    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "true");
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "false",
          newValue: "true",
        })
      );
    });

    await waitFor(() => {
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: {
          inputs: {
            accruedPensionAtLastAbs: 321,
            dateOfBirth: "",
          },
        },
      });
    });
    expect(screen.getByText("Saved Locally")).toBeVisible();

    const writeSpy = vi.spyOn(window.localStorage, "setItem");
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "true",
          newValue: "true",
        })
      );
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "true",
          newValue: "true",
        })
      );
    });
    expect(
      writeSpy.mock.calls.filter(
        ([key]) => key === QUICK_CALCULATOR_STORAGE_KEY
      )
    ).toHaveLength(0);
  });

  it("does not create a quick snapshot when saving is enabled without new edits", () => {
    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "false");
    window.localStorage.removeItem("cs-pension-modeller.acknowledgement");
    render(<QuickCalculatorPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue without analytics" })
    );

    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "true");
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "false",
          newValue: "true",
        })
      );
    });

    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
    expect(
      screen.getByText(/Local saving is enabled. New quick calculator inputs/)
    ).toBeVisible();
  });

  it("clears retained state when the write boundary discovers disabled saving", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00"));
    try {
      saveCompleteQuickState({
        dateOfBirth: "1977-05-01",
        accruedPensionAtLastAbs: 8_750,
        pensionableEarnings: 61_000,
        alphaEpaEnabled: true,
        alphaEpaPeriods: [
          {
            id: "old-epa",
            yearsBeforeNpa: 1,
            startDate: "2030-04-01",
            endDate: "2031-03-31",
          },
        ],
      });
      const view = render(<QuickCalculatorPage />);
      const initialWorker = ControlledWorker.instances.at(-1)!;
      act(() => initialWorker.respond());
      expect(screen.getAllByRole("article")).toHaveLength(8);

      disableLocalSavingAndClearStoredData();
      const addedPension = screen.getByLabelText(
        "Monthly Added Pension payment (£ per month) exact value"
      );
      fireEvent.change(addedPension, { target: { value: "275" } });
      fireEvent.blur(addedPension);

      expect(
        screen.getByRole("dialog", { name: "Important information" })
      ).toBeVisible();
      expect(screen.queryAllByRole("article")).toHaveLength(0);
      expect(
        window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
      ).toBeNull();
      const staleWorker = ControlledWorker.instances.at(-1)!;
      expect(staleWorker.terminated).toBe(true);
      act(() => staleWorker.respond());
      expect(screen.queryAllByRole("article")).toHaveLength(0);

      fireEvent.click(
        screen.getByRole("button", { name: "Continue without analytics" })
      );
      const accrued = screen.getByLabelText(
        "Alpha pension on your statement (£ per year)"
      );
      const earnings = screen.getByLabelText(
        "Pensionable earnings (£ per year) exact value"
      );
      fireEvent.change(accrued, { target: { value: "321" } });
      fireEvent.blur(accrued);
      fireEvent.change(earnings, { target: { value: "44444" } });
      fireEvent.blur(earnings);
      fireEvent.focus(window);
      expect(accrued).toHaveValue(321);
      expect(earnings).toHaveValue(44_444);
      expect(
        window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
      ).toBeNull();

      expect(saveLocalStoragePreference(true)).toBe(true);
      fireEvent.focus(window);
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: {
          inputs: {
            dateOfBirth: "",
            accruedPensionAtLastAbs: 321,
            pensionableEarnings: 44_444,
            alphaEpaEnabled: false,
            alphaEpaPeriods: [],
          },
          completion: { dateOfBirth: false },
        },
      });

      view.unmount();
      ControlledWorker.instances = [];
      render(<QuickCalculatorPage />);
      fireEvent.click(
        screen.getByRole("button", { name: "Continue without analytics" })
      );
      expect(
        screen.getByLabelText("Alpha pension on your statement (£ per year)")
      ).toHaveValue(321);
      expect(
        screen.getByLabelText("Pensionable earnings (£ per year) exact value")
      ).toHaveValue(44_444);
      expect(screen.getByLabelText("Birth month and year month")).toHaveValue(
        ""
      );
      fireEvent.click(screen.getByText("State Pension and EPA"));
      expect(screen.getByLabelText("Add EPA")).not.toBeChecked();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a new invalid EPA draft unsaved when saving is re-enabled", () => {
    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "false");
    window.localStorage.removeItem("cs-pension-modeller.acknowledgement");
    render(<QuickCalculatorPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue without analytics" })
    );
    fireEvent.change(
      screen.getByLabelText("Alpha pension on your statement (£ per year)"),
      { target: { value: "321" } }
    );
    fireEvent.blur(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    );
    fireEvent.click(screen.getByText("State Pension and EPA"));
    fireEvent.click(screen.getByLabelText("Add EPA"));
    fireEvent.click(screen.getByRole("button", { name: "Add EPA period" }));
    const startDate = screen.getByLabelText("EPA start date 1");
    fireEvent.change(startDate, { target: { value: "" } });

    expect(saveLocalStoragePreference(true)).toBe(true);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_STORAGE_ENABLED_KEY,
          oldValue: "false",
          newValue: "true",
        })
      );
    });

    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
    expect(
      screen.getByText(/Current changes have not been saved/)
    ).toBeVisible();
    expect(startDate).toHaveValue("");
  });

  it("reports a quick snapshot write failure without claiming the edit was saved", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    await latestWorker();
    const addedPension = screen.getByLabelText(
      "Monthly Added Pension payment (£ per month) exact value"
    );
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    fireEvent.change(addedPension, { target: { value: "300" } });
    fireEvent.blur(addedPension);

    expect(
      screen.getByText(
        "The browser could not save these quick calculator inputs."
      )
    ).toBeVisible();
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
  });

  it("reconciles an enabled saving preference on focus without another edit", async () => {
    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "false");
    window.localStorage.removeItem("cs-pension-modeller.acknowledgement");
    render(<QuickCalculatorPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue without analytics" })
    );
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );
    fireEvent.change(accrued, { target: { value: "654" } });
    fireEvent.blur(accrued);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();

    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "true");
    fireEvent.focus(window);
    await waitFor(() =>
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: { inputs: { accruedPensionAtLastAbs: 654 } },
      })
    );
  });

  it("refreshes the captured date at midnight and rejects the old worker reply", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T23:59:59.900"));
    try {
      saveCompleteQuickState({
        dateOfBirth: "1960-01-01",
        alphaPensionAbsDate: "2025",
        alphaPensionDrawAge: 68,
      });
      const view = render(<QuickCalculatorPage />);
      const first = ControlledWorker.instances.at(-1)!;
      expect(first.request?.calculationDate).toBe("2026-01-01");
      act(() => first.respond());
      expect(screen.getAllByRole("article")).toHaveLength(8);
      expect(screen.queryAllByText("Estimate unavailable")).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      const second = ControlledWorker.instances.at(-1)!;
      expect(second).not.toBe(first);
      expect(first.terminated).toBe(true);
      expect(second.request?.calculationDate).toBe("2026-01-02");
      expect(second.request?.baseSettings.startDate).toBe("2026-01-02");
      act(() => first.respond());
      expect(screen.getByText(/previous committed inputs/)).toBeVisible();
      act(() => second.respond());
      expect(screen.getAllByRole("article")).toHaveLength(8);
      expect(screen.getAllByText("Estimate unavailable")).toHaveLength(4);
      expect(screen.getByText(/Current age on 2 Jan 2026/)).toBeVisible();

      const addedPension = screen.getByLabelText(
        "Monthly Added Pension payment (£ per month) exact value"
      );
      fireEvent.change(addedPension, { target: { value: "250" } });
      fireEvent.blur(addedPension);
      expect(ControlledWorker.instances.at(-1)?.request?.calculationDate).toBe(
        "2026-01-02"
      );

      vi.setSystemTime(new Date("2026-01-03T12:00:00"));
      void act(() => document.dispatchEvent(new Event("visibilitychange")));
      expect(ControlledWorker.instances.at(-1)?.request?.calculationDate).toBe(
        "2026-01-03"
      );

      const workerCountBeforeInvalidDraft = ControlledWorker.instances.length;
      const retirementAge = screen.getByLabelText(
        "Selected retirement age exact value"
      );
      fireEvent.change(retirementAge, { target: { value: "68.2" } });
      fireEvent.keyDown(retirementAge, { key: "Enter" });
      expect(screen.queryAllByRole("article")).toHaveLength(0);
      vi.setSystemTime(new Date("2026-01-04T12:00:00"));
      void act(() => document.dispatchEvent(new Event("visibilitychange")));
      expect(ControlledWorker.instances).toHaveLength(
        workerCountBeforeInvalidDraft
      );
      expect(screen.getByText(/Current age on 4 Jan 2026/)).toBeVisible();

      const retirementAgeSlider = screen.getByLabelText(
        "Selected retirement age",
        { exact: true }
      );
      fireEvent.change(retirementAgeSlider, { target: { value: "68.25" } });
      fireEvent.blur(retirementAgeSlider);
      expect(ControlledWorker.instances.at(-1)?.request?.calculationDate).toBe(
        "2026-01-04"
      );
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gates an invalid State Pension draft only while that source is enabled", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const initial = await latestWorker();
    act(() => initial.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    fireEvent.click(screen.getByText("State Pension and EPA"));
    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    fireEvent.change(amount, { target: { value: "-1" } });
    fireEvent.blur(amount);
    expect(amount).toHaveValue(-1);
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );
    const excludedWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(2);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => excludedWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    expect(amount).toHaveValue(-1);
    expect(loadQuickCalculatorState()).toMatchObject({
      status: "loaded",
      state: {
        inputs: {
          showStatePension: false,
          currentStatePension: createDefaultSettings().currentStatePension,
        },
      },
    });
    expect(
      screen.getByText(
        /State Pension is excluded and the other inputs were saved/
      )
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
    expect(amount).toHaveValue(-1);
    fireEvent.change(amount, { target: { value: "12000" } });
    fireEvent.blur(amount);
    const corrected = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => corrected.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
  });

  it("restores the saved exclusion without restoring an invalid State Pension draft", async () => {
    saveCompleteQuickState();
    const view = render(<QuickCalculatorPage />);
    await latestWorker();
    fireEvent.click(screen.getByText("State Pension and EPA"));
    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    fireEvent.change(amount, { target: { value: "-1" } });
    fireEvent.blur(amount);
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );

    await waitFor(() =>
      expect(loadQuickCalculatorState()).toMatchObject({
        status: "loaded",
        state: { inputs: { showStatePension: false } },
      })
    );
    expect(amount).toHaveValue(-1);

    view.unmount();
    ControlledWorker.instances = [];
    render(<QuickCalculatorPage />);
    fireEvent.click(screen.getByText("State Pension and EPA"));
    expect(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("State Pension forecast (£ per year)")
    ).toHaveValue(createDefaultSettings().currentStatePension);
  });

  it("reloads the prior valid EPA snapshot while an invalid live draft is deferred", async () => {
    saveCompleteQuickState({
      alphaEpaEnabled: true,
      alphaEpaPeriods: [
        {
          id: "epa-reload",
          yearsBeforeNpa: 1,
          startDate: "2030-04-01",
          endDate: "2031-03-31",
        },
      ],
    });
    const view = render(<QuickCalculatorPage />);
    await latestWorker();
    fireEvent.click(screen.getByText("State Pension and EPA"));
    fireEvent.change(screen.getByLabelText("EPA start date 1"), {
      target: { value: "" },
    });
    expect(screen.getByLabelText("EPA start date 1")).toHaveValue("");
    expect(loadQuickCalculatorState()).toMatchObject({
      status: "loaded",
      state: {
        inputs: {
          alphaEpaPeriods: [{ startDate: "2030-04-01" }],
        },
      },
    });

    view.unmount();
    ControlledWorker.instances = [];
    render(<QuickCalculatorPage />);
    fireEvent.click(screen.getByText("State Pension and EPA"));
    expect(screen.getByLabelText("EPA start date 1")).toHaveValue("2030-04-01");
  });

  it("renders past normal-age variants unavailable while future selected variants remain", async () => {
    saveCompleteQuickState({
      dateOfBirth: "1959-06-01",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 68,
    });
    render(<QuickCalculatorPage />);
    const worker = await latestWorker();
    act(() => worker.respond());

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    expect(screen.getAllByText("Estimate unavailable")).toHaveLength(4);
    expect(
      screen.getAllByText(/cannot reconstruct retirement already taken/)
    ).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: /At your selected age/ })
    ).toHaveTextContent("68 years");
  });

  it("preserves a disabled invalid State Pension draft across an external update", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    await latestWorker();
    fireEvent.click(screen.getByText("State Pension and EPA"));
    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    fireEvent.change(amount, { target: { value: "-1" } });
    fireEvent.blur(amount);
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    saveCompleteQuickState({ currentStatePension: 14_000 });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(amount).toHaveValue(-1);
    expect(screen.queryByText("Enter 0 or more.")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );
    expect(screen.getByText("Enter 0 or more.")).toBeVisible();
  });

  it.each([
    ["start", "EPA start date 1", "Enter a valid EPA start date."],
    ["end", "EPA end date 1", "Enter a valid EPA end date."],
  ])(
    "preserves an invalid EPA %s date across an external update",
    async (_date, label, message) => {
      saveCompleteQuickState({
        alphaEpaEnabled: true,
        alphaEpaPeriods: [
          {
            id: "epa-external",
            yearsBeforeNpa: 1,
            startDate: "2030-04-01",
            endDate: "2031-03-31",
          },
        ],
      });
      render(<QuickCalculatorPage />);
      await latestWorker();
      fireEvent.click(screen.getByText("State Pension and EPA"));
      const dateInput = screen.getByLabelText(label);
      fireEvent.change(dateInput, { target: { value: "" } });

      const oldValue = window.localStorage.getItem(
        QUICK_CALCULATOR_STORAGE_KEY
      );
      saveCompleteQuickState({ accruedPensionAtLastAbs: 9_999 });
      const newValue = window.localStorage.getItem(
        QUICK_CALCULATOR_STORAGE_KEY
      );
      void act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: QUICK_CALCULATOR_STORAGE_KEY,
            oldValue,
            newValue,
          })
        );
      });

      expect(dateInput).toHaveValue("");
      expect(screen.getByText(message)).toBeVisible();
      expect(
        screen.getByLabelText("Alpha pension on your statement (£ per year)")
      ).toHaveValue(5_000);
      expect(screen.getByText(/local draft has been kept/)).toBeVisible();
    }
  );

  it("preserves an invalid EPA draft while EPA is disabled", async () => {
    saveCompleteQuickState({
      alphaEpaEnabled: true,
      alphaEpaPeriods: [
        {
          id: "epa-disabled-external",
          yearsBeforeNpa: 1,
          startDate: "2030-04-01",
          endDate: "2031-03-31",
        },
      ],
    });
    render(<QuickCalculatorPage />);
    await latestWorker();
    fireEvent.click(screen.getByText("State Pension and EPA"));
    fireEvent.change(screen.getByLabelText("EPA start date 1"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByLabelText("Add EPA"));

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    saveCompleteQuickState({ accruedPensionAtLastAbs: 9_999 });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(5_000);
    fireEvent.click(screen.getByLabelText("Add EPA"));
    expect(screen.getByLabelText("EPA start date 1")).toHaveValue("");
    expect(screen.getByText("Enter a valid EPA start date.")).toBeVisible();
  });

  it("preserves a valid uncommitted numeric draft across an external update", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    await latestWorker();
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );
    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    fireEvent.change(accrued, { target: { value: "6789" } });
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      oldValue
    );
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    saveCompleteQuickState({ accruedPensionAtLastAbs: 9_999 });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(accrued).toHaveValue(6_789);
    expect(screen.getByText(/local draft has been kept/)).toBeVisible();
  });

  it("preserves a partial birth-month draft across an external update", () => {
    render(<QuickCalculatorPage />);
    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    saveCompleteQuickState({ dateOfBirth: "1977-05-01" });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(screen.getByLabelText("Birth month and year month")).toHaveValue(
      "06"
    );
    expect(screen.getByLabelText("Birth month and year year")).toHaveValue("");
    expect(
      screen.getByText("Choose both a birth month and year.")
    ).toBeVisible();
  });

  it("adopts a clean external snapshot without echoing it or accepting stale work", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const staleWorker = await latestWorker();
    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    saveCompleteQuickState({ accruedPensionAtLastAbs: 9_999 });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    const writeSpy = vi.spyOn(window.localStorage, "setItem");

    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(staleWorker.terminated).toBe(true);
    act(() => staleWorker.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(9_999);
    expect(
      writeSpy.mock.calls.filter(
        ([key]) => key === QUICK_CALCULATOR_STORAGE_KEY
      )
    ).toHaveLength(0);
    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    const adoptedWorker = ControlledWorker.instances.at(-1)!;
    act(() => adoptedWorker.respond());
    expect(screen.getAllByRole("article")).toHaveLength(8);
  });
});
