import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  SUPPORT_PAYMENT_LINK_URL,
  getSupportPaymentLinkUrl,
} from "./support-prompt-config";
import { SupportPrompt, SupportPromptThankYou } from "./support-prompt";
import type { SupportPromptViewModel } from "./use-support-prompt";

function createPrompt(
  overrides: Partial<SupportPromptViewModel> = {}
): SupportPromptViewModel {
  return {
    isOpen: true,
    showThankYouStatus: false,
    dismissThankYouStatus: vi.fn(),
    buyCoffee: vi.fn(),
    maybeLater: vi.fn(),
    dismiss: vi.fn(),
    markSupported: vi.fn(),
    decline: vi.fn(),
    ...overrides,
  };
}

describe("SupportPrompt", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not render Stripe integration before the dialog opens", () => {
    render(<SupportPrompt prompt={createPrompt({ isOpen: false })} />);

    expect(document.querySelector("script[src*='stripe']")).toBeNull();
    expect(document.querySelector("stripe-buy-button")).toBeNull();
    expect(
      screen.queryByRole("dialog", {
        name: "Found the modeller useful?",
      })
    ).not.toBeInTheDocument();
  });

  it("renders the configured Stripe Payment Link as the primary support action", () => {
    const prompt = createPrompt();
    render(<SupportPrompt prompt={prompt} />);

    const link = screen.getByRole("link", {
      name: "Buy me a coffee",
    });

    expect(link).toHaveAttribute("href", SUPPORT_PAYMENT_LINK_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(getSupportPaymentLinkUrl()).toBe(SUPPORT_PAYMENT_LINK_URL);
    expect(document.querySelector("script[src*='stripe']")).toBeNull();
    expect(document.querySelector("stripe-buy-button")).toBeNull();
    expect(
      screen.getByText("Payment is handled securely by Stripe.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Maybe later" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "I’ve already bought you a coffee",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "No thanks — don’t ask again",
      })
    ).toBeInTheDocument();
  });

  it("snoozes intent without blocking the external support link", () => {
    const prompt = createPrompt();
    render(<SupportPrompt prompt={prompt} />);
    const link = screen.getByRole("link", {
      name: "Buy me a coffee",
    });

    const clickWasNotCancelled = link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );

    expect(clickWasNotCancelled).toBe(true);
    expect(prompt.buyCoffee).toHaveBeenCalledTimes(1);
    expect(prompt.markSupported).not.toHaveBeenCalled();
  });

  it("maps Maybe later, Escape, supported, and declined actions to the supplied handlers", () => {
    const prompt = createPrompt();

    render(<SupportPrompt prompt={prompt} />);

    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "I’ve already bought you a coffee",
      })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "No thanks — don’t ask again" })
    );

    expect(
      screen.queryByRole("button", { name: "Close support prompt" })
    ).not.toBeInTheDocument();
    expect(prompt.maybeLater).toHaveBeenCalledTimes(1);
    expect(prompt.dismiss).toHaveBeenCalledTimes(1);
    expect(prompt.markSupported).toHaveBeenCalledTimes(1);
    expect(prompt.decline).toHaveBeenCalledTimes(1);
  });

  it("contains keyboard focus and restores focus after closing", () => {
    vi.useFakeTimers();
    const opener = document.createElement("button");
    opener.textContent = "Open results";
    document.body.appendChild(opener);
    opener.focus();
    const prompt = createPrompt();
    const { rerender } = render(<SupportPrompt prompt={prompt} />);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Buy me a coffee" })
    );

    screen.getByRole("button", { name: "No thanks — don’t ask again" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Buy me a coffee" })
    );

    rerender(<SupportPrompt prompt={{ ...prompt, isOpen: false }} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe("SupportPromptThankYou", () => {
  it("renders a dismissible non-modal thank-you status", () => {
    const onDismiss = vi.fn();

    render(<SupportPromptThankYou show onDismiss={onDismiss} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for supporting the modeller."
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
