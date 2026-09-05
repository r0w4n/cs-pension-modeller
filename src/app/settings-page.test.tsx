import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsPage } from "./settings-page";

describe("settings-page", () => {
  it("renders the guidance notes toggle and emits changes", () => {
    const onShowGuidanceNotesChange = vi.fn();

    render(
      <SettingsPage
        analyticsConsentGranted={false}
        localStorageEnabled
        onClearAllData={vi.fn()}
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onAnalyticsConsentChange={vi.fn()}
        onLocalStorageEnabledChange={vi.fn()}
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
        onClearAllData={vi.fn()}
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onAnalyticsConsentChange={onAnalyticsConsentChange}
        onLocalStorageEnabledChange={vi.fn()}
        showGuidanceNotes
        onShowGuidanceNotesChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Allow analytics" }));
    expect(onAnalyticsConsentChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("status")).toHaveTextContent("Analytics turned on");
  });
});
