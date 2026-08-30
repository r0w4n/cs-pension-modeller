import { fireEvent, render, screen } from "@testing-library/react";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
} from "../settings";
import {
  JointHouseholdTargetFields,
  JointPartnerTaxFields,
} from "./joint-retirement-controls";

describe("joint retirement controls", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it("uses the established range and currency field components", () => {
    const settings = createJointSettings("1990-06-01");

    render(
      <JointHouseholdTargetFields
        settings={settings}
        onChange={onChange}
        showGuidanceNotes
      />
    );

    expect(screen.getByLabelText("Your retirement age")).toHaveClass(
      "range-input"
    );
    expect(
      screen.getByLabelText(
        "Your gross annual employment income before retirement"
      )
    ).toHaveClass("range-input");
    expect(
      screen.getByLabelText(
        "Your gross annual employment income before retirement exact value"
      )
    ).toHaveClass("number-input");
    expect(
      screen
        .getByLabelText("Your gross annual employment income before retirement")
        .closest(".field-card")
    ).toContainElement(
      screen.getByText(/Used only after Partner retires first/i)
    );
    expect(
      screen
        .getByLabelText(
          "Partner gross annual employment income before retirement"
        )
        .closest(".field-card")
    ).not.toHaveTextContent(/Used for partial-retirement work income/i);
    expect(
      screen.getByLabelText(
        "Household target from your retirement until Partner retires"
      )
    ).toHaveClass("number-input");
    expect(
      screen.getByRole("button", {
        name: "Reset Partner gross annual employment income before retirement to default value",
      })
    ).toHaveTextContent("Reset to default (£42,000)");
    expect(
      screen.getAllByRole("button", { name: "Minimum £22,500" })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Moderate £45,400" })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Comfortable £62,700" })
    ).toHaveLength(2);
  });

  it("hides the transition target when both people retire in the same month", () => {
    const settings = createJointSettings(settingsDateOfBirth());

    render(
      <JointHouseholdTargetFields
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={false}
      />
    );

    expect(
      screen.queryByLabelText(/Household target from .* until .* retires/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Household target once you are both retired")
    ).toHaveClass("number-input");
  });

  it("uses calendar months, rather than birth days, to hide a zero-length transition", () => {
    const settings = createDefaultSettings();
    const jointSettings = {
      ...settings,
      dateOfBirth: "1970-06-15",
      requirementAge: 60,
      jointRetirement: { ...settings.jointRetirement, enabled: true },
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
      },
    };

    render(
      <JointHouseholdTargetFields
        settings={jointSettings}
        onChange={onChange}
        showGuidanceNotes={false}
      />
    );

    expect(
      screen.queryByLabelText(/Household target from .* until .* retires/i)
    ).not.toBeInTheDocument();
  });

  it("uses the shared checkbox and currency cards for Partner tax settings", () => {
    render(
      <JointPartnerTaxFields
        settings={createJointSettings("1990-06-01")}
        onChange={onChange}
        showGuidanceNotes
      />
    );

    expect(
      screen
        .getByLabelText("Track Partner pension lump-sum allowance")
        .closest(".field-card")
    ).toHaveClass("checkbox-field-card");
    expect(
      screen.getByLabelText("Partner pension lump-sum allowance", {
        selector: "input",
      })
    ).toHaveClass("number-input");
  });

  it("configures later-life household spending against the later retiree", () => {
    const settings = {
      ...createJointSettings("1990-06-01"),
      jointRetirement: {
        ...createDefaultSettings().jointRetirement,
        enabled: true,
        spendingStrategyType: "SPENDING_SMILE" as const,
      },
    };

    render(
      <JointHouseholdTargetFields
        settings={settings}
        onChange={onChange}
        showGuidanceNotes={false}
        showSpendingSmileEditor
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Household spending strategy once you are both retired",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Starts at Partner's retirement age/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/of the household target once you are both retired/i)
    ).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Spending strategy"), {
      target: { value: "FLAT" },
    });

    expect(onChange).toHaveBeenCalledWith(
      "jointRetirement",
      expect.objectContaining({ spendingStrategyType: "FLAT" })
    );
  });
});

function createJointSettings(partnerDateOfBirth: string) {
  const settings = createDefaultSettings();

  return {
    ...settings,
    jointRetirement: { ...settings.jointRetirement, enabled: true },
    partner: {
      ...createDefaultPartnerSettings(),
      dateOfBirth: partnerDateOfBirth,
    },
  };
}

function settingsDateOfBirth() {
  return createDefaultSettings().dateOfBirth;
}
