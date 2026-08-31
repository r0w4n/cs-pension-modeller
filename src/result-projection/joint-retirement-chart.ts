import { addYearsToIsoDate } from "../model-date";
import {
  createPartnerCalculationSettings,
  type PensionSettings,
  type PersonId,
} from "../settings";
import type {
  RetirementIncomeChartEvent,
  RetirementIncomeChartStaticMilestone,
} from "./retirement-income-chart-model";

type PersonEventContext = {
  owner: PersonId;
  subject: "You" | "Partner";
  possessive: "Your" | "Partner's";
  settings: PensionSettings;
};

export function createHouseholdChartEvents(
  settings: PensionSettings
): RetirementIncomeChartEvent[] {
  const events: RetirementIncomeChartEvent[] = [];
  const people: PersonEventContext[] = [
    {
      owner: "you",
      subject: "You",
      possessive: "Your",
      settings,
    },
    {
      owner: "partner",
      subject: "Partner",
      possessive: "Partner's",
      settings: createPartnerCalculationSettings(settings),
    },
  ];

  people.forEach((person) => addPersonEvents(events, person));
  addHouseholdPhaseEvents(events, settings);

  return events.sort(
    (left, right) =>
      left.timelineValue - right.timelineValue ||
      left.label.localeCompare(right.label)
  );
}

/**
 * Selects the two highest-signal household milestones for the chart itself.
 * The complete event list remains available through period inspection so the
 * plot stays readable when several sources start in the same month.
 */
export function createHouseholdChartMilestones(
  settings: PensionSettings
): RetirementIncomeChartStaticMilestone[] {
  return createHouseholdChartEvents(settings)
    .filter(
      (event) =>
        event.key === "you-retirement" || event.key === "partner-retirement"
    )
    .map((event) => ({
      key: event.key,
      label: event.label,
      shortLabel: event.owner === "partner" ? "Partner retires" : "You retire",
      timelineValue: event.timelineValue,
      colour: event.owner === "partner" ? "#2563a8" : "#0f6f72",
    }));
}

// The branches mirror the independently enabled person-owned sources so event
// ownership remains explicit in household period inspection details.
function addPersonEvents(
  events: RetirementIncomeChartEvent[],
  person: PersonEventContext
) {
  const { owner, possessive, settings, subject } = person;
  addAgeEvent(
    events,
    owner,
    `${owner}-retirement`,
    subject === "You" ? "You retire" : "Partner retires",
    settings,
    settings.requirementAge
  );

  if (settings.partialRetirementEnabled) {
    addAgeEvent(
      events,
      owner,
      `${owner}-partial-retirement`,
      `${subject} ${subject === "You" ? "start" : "starts"} partial retirement`,
      settings,
      settings.partialRetirementStartAge
    );
  }
  if (settings.showAlpha) {
    addAgeEvent(
      events,
      owner,
      `${owner}-alpha-leave`,
      `${subject} ${subject === "You" ? "leave" : "leaves"} Alpha`,
      settings,
      settings.alphaPensionLeaveAge
    );
    addAgeEvent(
      events,
      owner,
      `${owner}-alpha-start`,
      `${possessive} Alpha pension starts`,
      settings,
      settings.alphaPensionDrawAge
    );
  }
  addPensionStartEvent(
    events,
    person,
    settings.showClassic,
    "classic",
    "classic pension",
    settings.classicPensionDrawAge
  );
  addPensionStartEvent(
    events,
    person,
    settings.showClassicPlus,
    "classic-plus",
    "classic plus pension",
    settings.classicPlusPensionDrawAge
  );
  addPensionStartEvent(
    events,
    person,
    settings.showNuvos,
    "nuvos",
    "Nuvos pension",
    settings.nuvosPensionDrawAge
  );
  addPensionStartEvent(
    events,
    person,
    settings.showPremium,
    "premium",
    "Premium pension",
    settings.premiumDrawAge
  );
  addFlexibleAccountEvents(events, person, {
    enabled: settings.showSipp,
    key: "sipp",
    label: "SIPP withdrawals",
    startAge: settings.sippDrawAge,
    stopAge: settings.sippWithdrawalTargetAge,
    stopEnabled: settings.sippWithdrawalStrategy === "use_by_age",
  });
  addFlexibleAccountEvents(events, person, {
    enabled: settings.showCsAvc,
    key: "cs-avc",
    label: "Civil Service AVC withdrawals",
    startAge: settings.csAvcDrawAge,
    stopAge: settings.csAvcWithdrawalTargetAge,
    stopEnabled: settings.csAvcWithdrawalStrategy === "use_by_age",
  });
  addFlexibleAccountEvents(events, person, {
    enabled: settings.showIsa,
    key: "isa",
    label: "ISA withdrawals",
    startAge: settings.isaDrawAge,
    stopAge: settings.isaWithdrawalTargetAge,
    stopEnabled: settings.isaWithdrawalStrategy === "use_by_age",
  });
  addFlexibleAccountEvents(events, person, {
    enabled: settings.showLisa,
    key: "lisa",
    label: "LISA withdrawals",
    startAge: settings.lisaDrawAge,
    stopAge: settings.lisaWithdrawalTargetAge,
    stopEnabled: settings.lisaWithdrawalStrategy === "use_by_age",
  });
  if (settings.showStatePension) {
    addDateEvent(
      events,
      owner,
      `${owner}-state-pension`,
      `${possessive} State Pension starts`,
      settings.statePensionDrawDate
    );
  }
  if (settings.showAdditionalGuaranteedIncome) {
    settings.additionalGuaranteedIncomes.forEach((income) => {
      if (
        income.annualAmount === null ||
        income.annualAmount <= 0 ||
        income.startAge === null
      ) {
        return;
      }
      const label = income.name.trim() || "additional income";
      addAgeEvent(
        events,
        owner,
        `${owner}-additional-${income.id}-start`,
        `${possessive} ${label} starts`,
        settings,
        income.startAge
      );
      if (income.endAge !== null && income.endAge !== undefined) {
        addAgeEvent(
          events,
          owner,
          `${owner}-additional-${income.id}-stop`,
          `${possessive} ${label} ends`,
          settings,
          income.endAge + 1
        );
      }
    });
  }
}

function addPensionStartEvent(
  events: RetirementIncomeChartEvent[],
  person: PersonEventContext,
  enabled: boolean,
  key: string,
  label: string,
  age: number
) {
  if (!enabled) {
    return;
  }
  addAgeEvent(
    events,
    person.owner,
    `${person.owner}-${key}-start`,
    `${person.possessive} ${label} starts`,
    person.settings,
    age
  );
}

function addFlexibleAccountEvents(
  events: RetirementIncomeChartEvent[],
  person: PersonEventContext,
  account: {
    enabled: boolean;
    key: string;
    label: string;
    startAge: number;
    stopAge: number;
    stopEnabled: boolean;
  }
) {
  if (!account.enabled) {
    return;
  }
  addAgeEvent(
    events,
    person.owner,
    `${person.owner}-${account.key}-start`,
    `${person.possessive} ${account.label} start`,
    person.settings,
    account.startAge
  );
  if (account.stopEnabled) {
    addAgeEvent(
      events,
      person.owner,
      `${person.owner}-${account.key}-stop`,
      `${person.possessive} ${account.label} stop`,
      person.settings,
      account.stopAge
    );
  }
}

function addHouseholdPhaseEvents(
  events: RetirementIncomeChartEvent[],
  settings: PensionSettings
) {
  if (settings.jointRetirement.spendingStrategyType !== "SPENDING_SMILE") {
    return;
  }
  const later = getLaterRetirementSettings(settings);
  addAgeEvent(
    events,
    undefined,
    "household-go-go",
    "Household Go-go phase starts",
    later,
    later.requirementAge
  );
  addAgeEvent(
    events,
    undefined,
    "household-slow-go",
    "Household Slow-go phase starts",
    later,
    settings.jointRetirement.spendingSmile.slowGoStartAge
  );
  addAgeEvent(
    events,
    undefined,
    "household-no-go",
    "Household No-go phase starts",
    later,
    settings.jointRetirement.spendingSmile.noGoStartAge
  );
}

function addAgeEvent(
  events: RetirementIncomeChartEvent[],
  owner: PersonId | undefined,
  key: string,
  label: string,
  settings: PensionSettings,
  age: number
) {
  addDateEvent(
    events,
    owner,
    key,
    label,
    addYearsToIsoDate(settings.dateOfBirth, age)
  );
}

function addDateEvent(
  events: RetirementIncomeChartEvent[],
  owner: PersonId | undefined,
  key: string,
  label: string,
  date: string
) {
  events.push({
    key,
    label,
    date,
    timelineValue: calendarTimelineValue(date),
    ...(owner ? { owner } : {}),
  });
}

function getLaterRetirementSettings(settings: PensionSettings) {
  const partner = createPartnerCalculationSettings(settings);
  const youDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const partnerDate = addYearsToIsoDate(
    partner.dateOfBirth,
    partner.requirementAge
  );
  return partnerDate >= youDate ? partner : settings;
}

function calendarTimelineValue(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return year + (month - 1) / 12 + (day - 1) / 365;
}

export function describeHouseholdChartEvent(event: RetirementIncomeChartEvent) {
  return `${event.label} in ${formatEventMonth(event.date)}`;
}

function formatEventMonth(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
