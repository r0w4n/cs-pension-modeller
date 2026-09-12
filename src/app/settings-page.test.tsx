import { act, fireEvent, render, screen } from "@testing-library/react";
import { SettingsPage } from "./settings-page";

const successfulStorageOutcome = {
  persistentDataCleared: true,
  localSavingDisabled: true,
};

describe("settings-page", () => {
  it("renders the guidance notes toggle and emits changes", () => {
    const onShowGuidanceNotesChange = vi.fn();

    render(
      <SettingsPage
        analyticsConsentGranted={false}
        localStorageEnabled
        onClearAllData={vi.fn(() => successfulStorageOutcome)}
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onAnalyticsConsentChange={vi.fn()}
        onLocalStorageEnabledChange={vi.fn(() => successfulStorageOutcome)}
        showGuidanceNotes
        onShowGuidanceNotesChange={onShowGuidanceNotesChange}
      />
    );

    expect(document.title).toBe("Settings | Civil Service Pension Modeller");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Manage saved assumptions, local storage, and guidance notes for this browser."
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show guidance notes" })
    );
    expect(onShowGuidanceNotesChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("status")).toHaveTextContent("Settings saved");
  });

  it("renders the analytics toggle and emits changes", () => {
    const onAnalyticsConsentChange = vi.fn();

    render(
      <SettingsPage
        analyticsConsentGranted={false}
        localStorageEnabled
        onClearAllData={vi.fn(() => successfulStorageOutcome)}
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onAnalyticsConsentChange={onAnalyticsConsentChange}
        onLocalStorageEnabledChange={vi.fn(() => successfulStorageOutcome)}
        showGuidanceNotes
        onShowGuidanceNotesChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Allow analytics" }));
    expect(onAnalyticsConsentChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("status")).toHaveTextContent("Analytics turned on");
  });

  it("keeps clear-data errors visible until superseded", () => {
    vi.useFakeTimers();

    render(
      <SettingsPage
        analyticsConsentGranted={false}
        localStorageEnabled
        onClearAllData={vi.fn(() => ({
          persistentDataCleared: false,
          localSavingDisabled: true,
        }))}
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onAnalyticsConsentChange={vi.fn()}
        onLocalStorageEnabledChange={vi.fn(() => successfulStorageOutcome)}
        showGuidanceNotes
        onShowGuidanceNotesChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear all data" }));

    expect(screen.queryByText("Data cleared")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "the browser did not confirm deletion from local storage"
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "the browser did not confirm deletion from local storage"
    );

    vi.useRealTimers();
  });
});
