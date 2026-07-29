import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings, validateSettings } from "../settings";
import { SpendingSmileEditor } from "./spending-smile-editor";

describe("SpendingSmileEditor", () => {
  it("uses a standard dropdown and hides SMILE fields for flat spending", () => {
    renderEditor({ spendingStrategyType: "FLAT" });

    expect(
      screen.getByRole("combobox", { name: "Spending strategy" })
    ).toHaveValue("FLAT");
    expect(
      screen.queryByRole("heading", { name: "SMILE phase configuration" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(
        "Go-go years percentage of Retirement Living Standards target"
      )
    ).not.toBeInTheDocument();
  });

  it("shows only percentages and later-phase ages for SMILE spending", () => {
    renderEditor({ spendingStrategyType: "SPENDING_SMILE" });

    expect(screen.queryByText("Expert feature")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "SMILE phase configuration" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Each percentage is applied/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("slider", {
        name: "Go-go years percentage of Retirement Living Standards target",
      })
    ).toHaveValue("100");
    const slowGoPercentageSlider = screen.getByRole("slider", {
      name: "Slow-go years percentage of Retirement Living Standards target",
    });
    expect(slowGoPercentageSlider).toHaveValue("85");
    expect(slowGoPercentageSlider).toHaveAttribute("step", "1");
    expect(
      screen.getByRole("slider", { name: "Slow-go years start age" })
    ).toHaveValue("75");
    expect(
      screen.getByRole("slider", { name: "Slow-go years start age" })
    ).toHaveAttribute("max", "79");
    expect(
      screen.getByRole("spinbutton", {
        name: "Slow-go years start age exact value",
      })
    ).toHaveValue(75);
    expect(
      screen.getByRole("slider", { name: "No-go years start age" })
    ).toHaveValue("80");
    expect(
      screen.getByRole("slider", { name: "No-go years start age" })
    ).toHaveAttribute("min", "76");
    expect(
      screen.getByRole("spinbutton", {
        name: "No-go years start age exact value",
      })
    ).toHaveValue(80);
    expect(
      screen.getByRole("slider", {
        name: "No-go years percentage of Retirement Living Standards target",
      })
    ).toHaveValue("70");
    expect(
      screen.getByRole("heading", {
        name: "Go-go years (Active early retirement)",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Slow-go years (Middle retirement)",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "No-go years (Later retirement)",
      })
    ).toBeInTheDocument();
    const slowGoPercentageInput = screen.getByRole("spinbutton", {
      name: "Slow-go years percentage exact value",
    });
    expect(slowGoPercentageInput).toHaveValue(85);
    expect(slowGoPercentageInput).toHaveAttribute("step", "1");
    expect(
      screen.queryByRole("spinbutton", { name: /annual spending/i })
    ).not.toBeInTheDocument();
  });

  it("caps the no-go start age at life expectancy", () => {
    renderEditor({
      lifeExpectancy: 80,
      spendingStrategyType: "SPENDING_SMILE",
    });

    expect(screen.getAllByTestId("spending-phase-boundary")).toHaveLength(2);
    expect(
      screen.getByRole("slider", { name: "Slow-go years start age" })
    ).toHaveValue("75");
    const noGoStartAgeSlider = screen.getByRole("slider", {
      name: "No-go years start age",
    });
    expect(noGoStartAgeSlider).toHaveValue("80");
    expect(noGoStartAgeSlider).toHaveAttribute("max", "80");
    expect(
      screen.getByRole("spinbutton", {
        name: "No-go years start age exact value",
      })
    ).toHaveValue(80);
    expect(
      screen.queryByText(
        "This phase starts after the end of the current projection."
      )
    ).not.toBeInTheDocument();
  });

  it("updates phase ages from the slider and exact-value controls", () => {
    const settings = {
      ...createDefaultSettings(),
      lifeExpectancy: 95,
      spendingStrategyType: "SPENDING_SMILE" as const,
    };
    const onChange = vi.fn();

    render(
      <SpendingSmileEditor
        settings={settings}
        validationIssues={[]}
        onChange={onChange}
      />
    );

    fireEvent.change(
      screen.getByRole("slider", { name: "Slow-go years start age" }),
      { target: { value: "78" } }
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("spinbutton", {
        name: "Slow-go years start age exact value",
      })
    ).toHaveValue(78);

    fireEvent.pointerUp(
      screen.getByRole("slider", { name: "Slow-go years start age" })
    );
    expect(onChange).toHaveBeenCalledWith("spendingSmile", {
      ...settings.spendingSmile,
      slowGoStartAge: 78,
    });

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "No-go years start age exact value",
      }),
      { target: { value: "88" } }
    );
    expect(onChange).toHaveBeenCalledWith("spendingSmile", {
      ...settings.spendingSmile,
      noGoStartAge: 88,
    });

    onChange.mockClear();
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Slow-go years start age exact value",
      }),
      { target: { value: "60" } }
    );
    expect(onChange).toHaveBeenCalledWith("spendingSmile", {
      ...settings.spendingSmile,
      slowGoStartAge: 69,
    });

    onChange.mockClear();
    fireEvent.change(
      screen.getByRole("slider", {
        name: "Slow-go years percentage of Retirement Living Standards target",
      }),
      { target: { value: "80" } }
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("spinbutton", {
        name: "Slow-go years percentage exact value",
      })
    ).toHaveValue(80);
    expect(
      screen.getByText(/Slow-go annual spending is £26,945/)
    ).toBeInTheDocument();

    fireEvent.pointerUp(
      screen.getByRole("slider", {
        name: "Slow-go years percentage of Retirement Living Standards target",
      })
    );
    expect(onChange).toHaveBeenCalledWith("spendingSmile", {
      ...settings.spendingSmile,
      slowGoPercentage: 80,
    });
  });

  it("shows fixed monetary increments on the profile y-axis", () => {
    renderEditor({ spendingStrategyType: "SPENDING_SMILE" });

    expect(
      screen.getByText("Annual spending target (£ per year) by age")
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("spending-profile-y-axis-tick")).toHaveLength(
      5
    );
    expect(screen.getByTestId("spending-profile-y-axis")).toHaveTextContent(
      "£40,000"
    );
    expect(screen.getByTestId("spending-profile-y-axis")).toHaveTextContent(
      "£30,000"
    );
    expect(screen.getByTestId("spending-profile-y-axis")).toHaveTextContent(
      "£20,000"
    );
    expect(screen.getByTestId("spending-profile-y-axis")).toHaveTextContent(
      "£10,000"
    );
    expect(screen.getByTestId("spending-profile-y-axis")).toHaveTextContent(
      "£0"
    );
    expect(screen.getByTestId("spending-profile-y-axis")).not.toHaveTextContent(
      "£31,700"
    );
  });

  it("labels the profile x-axis at regular five-year ages", () => {
    renderEditor({
      requirementAge: 54,
      lifeExpectancy: 81,
      spendingStrategyType: "SPENDING_SMILE",
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 63,
        noGoStartAge: 77,
      },
    });

    const xAxis = screen.getByTestId("spending-profile-x-axis");

    expect(screen.getAllByTestId("spending-profile-x-axis-tick")).toHaveLength(
      6
    );
    expect(
      Array.from(xAxis.querySelectorAll("text"), (label) => label.textContent)
    ).toEqual(["55", "60", "65", "70", "75", "80"]);
  });

  it("shows SMILE validation beside the affected phase controls", () => {
    const settings = {
      ...createDefaultSettings(),
      requirementAge: 75,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 75,
      },
    };

    render(
      <SpendingSmileEditor
        settings={settings}
        validationIssues={validateSettings(settings)}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText("Slow-go years must start after your retirement age.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Slow-go years start age" })
    ).toHaveAttribute("aria-invalid", "true");
  });
});

function renderEditor(
  overrides: Partial<ReturnType<typeof createDefaultSettings>>
) {
  render(
    <SpendingSmileEditor
      settings={{ ...createDefaultSettings(), ...overrides }}
      validationIssues={[]}
      onChange={vi.fn()}
    />
  );
}
