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

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show guidance notes" })
    );
    expect(onShowGuidanceNotesChange).toHaveBeenCalledWith(false);
  });
});
