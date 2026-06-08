import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsPage } from "./settings-page";

describe("settings-page", () => {
  it("renders the guidance notes toggle and emits changes", () => {
    const onShowGuidanceNotesChange = vi.fn();

    render(
      <SettingsPage
        localStorageEnabled
        onExportParameters={vi.fn()}
        onLoadParameters={vi.fn(() => true)}
        onLocalStorageEnabledChange={vi.fn()}
        onResetParameters={vi.fn()}
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
  });
});
