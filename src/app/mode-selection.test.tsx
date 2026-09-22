import { fireEvent, render, screen } from "@testing-library/react";
import { ModeSelection } from "./mode-selection";

describe("mode-selection", () => {
  it("calls onSelectMode when a card is clicked", () => {
    const onSelectMode = vi.fn();

    render(<ModeSelection selectedMode={null} onSelectMode={onSelectMode} />);

    fireEvent.click(screen.getByRole("button", { name: /Simple journey/i }));
    expect(onSelectMode).toHaveBeenCalledWith("simple");
  });

  it("offers the separate quick calculator without adding a fourth mode", () => {
    render(<ModeSelection selectedMode={null} onSelectMode={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByRole("link", {
        name: "Open the Quick Alpha calculator (opens in a new tab).",
      })
    ).toHaveAttribute("href", "./quick-calculator/");
    expect(
      screen.getByRole("link", {
        name: "Open the Quick Alpha calculator (opens in a new tab).",
      })
    ).toHaveAttribute("target", "_blank");
  });
});
