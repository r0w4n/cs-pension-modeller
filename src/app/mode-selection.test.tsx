import { fireEvent, render, screen } from "@testing-library/react";
import { ModeSelection } from "./mode-selection";

describe("mode-selection", () => {
  it("calls onSelectMode when a card is clicked", () => {
    const onSelectMode = vi.fn();

    render(<ModeSelection selectedMode={null} onSelectMode={onSelectMode} />);

    fireEvent.click(screen.getByRole("button", { name: /Simple journey/i }));
    expect(onSelectMode).toHaveBeenCalledWith("simple");
  });

  it("offers Quick before Simple and selects it within the modeller", () => {
    const onSelectMode = vi.fn();
    render(<ModeSelection selectedMode="quick" onSelectMode={onSelectMode} />);
    const cards = screen.getAllByRole("button");
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveTextContent("Quick journey");
    expect(cards[0]).toHaveTextContent(
      "The original pension calculator, kept for those who prefer a simpler approach. Enter a few figures, explore your options and get a quick estimate of your retirement pension."
    );
    expect(cards[1]).toHaveTextContent("Simple journey");
    expect(cards[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(cards[0]);
    expect(onSelectMode).toHaveBeenCalledWith("quick");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
