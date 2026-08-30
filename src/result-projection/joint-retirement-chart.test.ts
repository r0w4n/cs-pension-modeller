import {
  createDefaultPartnerSettings,
  createDefaultSettings,
} from "../settings";
import { getRetirementIncomeEventsForDate } from "./retirement-income-chart-layout";
import { createHouseholdChartEvents } from "./joint-retirement-chart";

describe("joint retirement chart events", () => {
  it("retains and groups owner-attributed household events by calendar month", () => {
    const base = createDefaultSettings();
    const settings = {
      ...base,
      dateOfBirth: "1985-06-01",
      requirementAge: 60,
      alphaPensionDrawAge: 60,
      sippDrawAge: 60,
      showAlpha: true,
      showSipp: true,
      jointRetirement: { ...base.jointRetirement, enabled: true },
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1982-03-01",
        requirementAge: 63,
        showAlpha: false,
        showSipp: true,
      },
    };

    const events = createHouseholdChartEvents(settings);
    const june2045 = getRetirementIncomeEventsForDate(events, "2045-06-15");

    expect(june2045.map((event) => event.label)).toEqual(
      expect.arrayContaining([
        "You retire",
        "Your Alpha pension starts",
        "Your SIPP withdrawals start",
      ])
    );
    expect(events.some((event) => event.owner === "you")).toBe(true);
    expect(events.some((event) => event.owner === "partner")).toBe(true);
  });
});
