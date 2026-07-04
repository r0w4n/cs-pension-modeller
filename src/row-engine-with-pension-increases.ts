import type { PensionSettings } from "./settings";
import {
  calculateMonthlyEpaAlphaAccrual,
  calculateMonthlyStandardAlphaAccrual,
} from "./projection-domains/alpha";
import {
  addYears,
  generateMonthlyDateRange,
  getModelledPensionInflationPercent,
  minIsoDate,
  type DerivedProjectionInputs,
  type ProjectionRuntimeDates,
} from "./derive-inputs";
import {
  attachMilestonesToRows,
  buildProjectionRow,
  calculateAddedPensionValues,
  calculateInvestmentProjectionValues,
  calculateNuvosAnnualPension,
  calculatePremiumAnnualPension,
} from "./row-assembly";

type AlphaBenefitPortion = "standard" | "epa";

type AlphaRevaluationEvent = {
  amount: number;
  dueDate: string;
  portion: AlphaBenefitPortion;
};

export function createProjectionTableWithPensionIncreases(
  settings: PensionSettings,
  derivedInputs: DerivedProjectionInputs,
  runtimeDates: ProjectionRuntimeDates
) {
  const {
    endDate,
    drawDate,
    accrualStopDate,
    nuvosDrawDate,
    nuvosAccrualStopDate,
    nuvosNpaDate,
    nuvosReductionFactor,
    premiumDrawDate,
    premiumReductionFactor,
    addedPensionStopDate,
    npaDate,
    epaDate,
    reductionFactor,
    epaReductionFactor,
  } = derivedInputs;
  const {
    sippDrawDate,
    isaDrawDate,
    lisaDrawDate,
    alphaAbsDate,
    nuvosAbsDate,
  } = runtimeDates;
  const firstRowDate = minIsoDate(
    minIsoDate(
      alphaAbsDate,
      settings.showNuvos ? nuvosAbsDate : settings.startDate
    ),
    settings.startDate
  );
  const alphaRevaluationTracker = createAlphaRevaluationTracker({
    activeUntilDate: accrualStopDate,
    cpiPercent: getModelledPensionInflationPercent(settings),
    endDate,
  });
  alphaRevaluationTracker.addComponent({
    amount: settings.accruedPensionAtLastAbs,
    startDate: alphaAbsDate,
    portion: "standard",
  });
  let previousRowDate: string | undefined;

  const historicalRowDates = generateMonthlyDateRange(
    firstRowDate,
    settings.startDate
  ).filter((rowDate) => rowDate < settings.startDate);
  const projectionRowDates = generateMonthlyDateRange(
    settings.startDate,
    endDate
  );
  const allRowDates = Array.from(
    new Set([...historicalRowDates, ...projectionRowDates])
  ).sort();

  const allRows = allRowDates.map((rowDate) => {
    const { sippProjection, isaProjection, lisaProjection } =
      calculateInvestmentProjectionValues({
        settings,
        rowDate,
        endDate,
        sippDrawDate,
        isaDrawDate,
        lisaDrawDate,
        active: rowDate >= settings.startDate,
      });
    const shouldShowAbsStatementOnly =
      rowDate === alphaAbsDate && rowDate < settings.startDate;
    const shouldSuppressMonthlyAlphaAccrual = shouldShowAbsStatementOnly;
    const monthlyStandardAlphaAccrual =
      rowDate <= accrualStopDate && !shouldSuppressMonthlyAlphaAccrual
        ? calculateMonthlyStandardAlphaAccrual(settings, rowDate)
        : 0;
    const monthlyEpaAlphaAccrual =
      rowDate <= accrualStopDate && !shouldSuppressMonthlyAlphaAccrual
        ? calculateMonthlyEpaAlphaAccrual(settings, rowDate)
        : 0;

    if (monthlyStandardAlphaAccrual > 0) {
      alphaRevaluationTracker.addComponent({
        amount: monthlyStandardAlphaAccrual,
        startDate: rowDate,
        portion: "standard",
      });
    }

    if (monthlyEpaAlphaAccrual > 0) {
      alphaRevaluationTracker.addComponent({
        amount: monthlyEpaAlphaAccrual,
        startDate: rowDate,
        portion: "epa",
      });
    }

    const { monthlyAddedPension, lumpSumAddedPension } =
      calculateAddedPensionValues({
        settings,
        rowDate,
        previousRowDate,
        addedPensionStopDate,
        suppressAddedPension: shouldSuppressMonthlyAlphaAccrual,
      });

    if (monthlyAddedPension > 0) {
      alphaRevaluationTracker.addComponent({
        amount: monthlyAddedPension,
        startDate: rowDate,
        portion: "standard",
      });
    }

    if (lumpSumAddedPension > 0) {
      alphaRevaluationTracker.addComponent({
        amount: lumpSumAddedPension,
        startDate: rowDate,
        portion: "standard",
      });
    }

    const alphaPortions = alphaRevaluationTracker.getPortionsAt(rowDate);
    const row = buildProjectionRow({
      settings,
      rowDate,
      drawDate,
      npaDate,
      epaDate,
      reductionFactor,
      epaReductionFactor,
      nuvosDrawDate,
      nuvosNpaDate,
      nuvosReductionFactor,
      premiumDrawDate,
      premiumReductionFactor,
      annualStandardAlphaPension: alphaPortions.standardAlphaPension,
      annualEpaAlphaPension: alphaPortions.epaAlphaPension,
      annualNuvosPension: calculateNuvosAnnualPension({
        settings,
        rowDate,
        nuvosAbsDate,
        nuvosAccrualStopDate,
      }),
      annualPremiumPension: calculatePremiumAnnualPension({
        settings,
        rowDate,
        premiumDrawDate,
      }),
      monthlyAddedPension,
      lumpSumAddedPension,
      sippProjection,
      isaProjection,
      lisaProjection,
    });

    previousRowDate = rowDate;

    return row;
  });

  return attachMilestonesToRows({
    rows: allRows,
    rowDates: allRowDates,
    settings,
    endDate,
    accrualStopDate,
    drawDate,
    sippDrawDate,
    isaDrawDate,
    lisaDrawDate,
    alphaAbsDate,
    nuvosAccrualStopDate,
    nuvosDrawDate,
    nuvosAbsDate,
    premiumDrawDate,
  });
}

function createAlphaRevaluationTracker(input: {
  activeUntilDate: string;
  cpiPercent: number;
  endDate: string;
}) {
  const { activeUntilDate, cpiPercent, endDate } = input;
  const cpiRate = cpiPercent / 100;
  const activeRate = cpiRate;
  const events: AlphaRevaluationEvent[] = [];
  const totals = {
    standardAlphaPension: 0,
    epaAlphaPension: 0,
  };

  return {
    addComponent(component: {
      amount: number;
      startDate: string;
      portion: AlphaBenefitPortion;
    }) {
      if (component.amount <= 0) {
        return;
      }

      addAmountToAlphaPortionTotals(
        totals,
        component.portion,
        component.amount
      );
      scheduleAlphaRevaluationEvent(events, {
        amount: component.amount,
        dueDate: addYears(component.startDate, 1),
        portion: component.portion,
      });
    },
    getPortionsAt(rowDate: string) {
      applyDueAlphaRevaluationEvents({
        events,
        totals,
        rowDate,
        endDate,
        activeUntilDate,
        cpiRate,
        activeRate,
      });

      return { ...totals };
    },
  };
}

function applyDueAlphaRevaluationEvents(input: {
  events: AlphaRevaluationEvent[];
  totals: {
    standardAlphaPension: number;
    epaAlphaPension: number;
  };
  rowDate: string;
  endDate: string;
  activeUntilDate: string;
  cpiRate: number;
  activeRate: number;
}) {
  const {
    events,
    totals,
    rowDate,
    endDate,
    activeUntilDate,
    cpiRate,
    activeRate,
  } = input;

  while (events[0] && events[0].dueDate <= rowDate) {
    const event = popNextAlphaRevaluationEvent(events);
    const revaluationRate =
      event.dueDate <= activeUntilDate ? activeRate : cpiRate;
    const revaluedAmount = event.amount * (1 + revaluationRate);
    const revaluationIncrease = revaluedAmount - event.amount;

    addAmountToAlphaPortionTotals(totals, event.portion, revaluationIncrease);

    const nextDueDate = addYears(event.dueDate, 1);
    if (nextDueDate <= endDate) {
      scheduleAlphaRevaluationEvent(events, {
        ...event,
        amount: revaluedAmount,
        dueDate: nextDueDate,
      });
    }
  }
}

function addAmountToAlphaPortionTotals(
  totals: {
    standardAlphaPension: number;
    epaAlphaPension: number;
  },
  portion: AlphaBenefitPortion,
  amount: number
) {
  if (portion === "epa") {
    totals.epaAlphaPension += amount;
    return;
  }

  totals.standardAlphaPension += amount;
}

function scheduleAlphaRevaluationEvent(
  events: AlphaRevaluationEvent[],
  event: AlphaRevaluationEvent
) {
  events.push(event);
  siftAlphaRevaluationEventUp(events, events.length - 1);
}

function popNextAlphaRevaluationEvent(events: AlphaRevaluationEvent[]) {
  const nextEvent = events[0];
  const lastEvent = events.pop();

  if (!nextEvent || !lastEvent) {
    throw new Error(
      "Cannot pop an Alpha revaluation event from an empty queue."
    );
  }

  if (events.length > 0) {
    events[0] = lastEvent;
    siftAlphaRevaluationEventDown(events, 0);
  }

  return nextEvent;
}

function siftAlphaRevaluationEventUp(
  events: AlphaRevaluationEvent[],
  index: number
) {
  let childIndex = index;

  while (childIndex > 0) {
    const parentIndex = Math.floor((childIndex - 1) / 2);

    if (events[parentIndex].dueDate <= events[childIndex].dueDate) {
      return;
    }

    [events[parentIndex], events[childIndex]] = [
      events[childIndex],
      events[parentIndex],
    ];
    childIndex = parentIndex;
  }
}

function siftAlphaRevaluationEventDown(
  events: AlphaRevaluationEvent[],
  index: number
) {
  let parentIndex = index;

  while (true) {
    const leftIndex = parentIndex * 2 + 1;
    const rightIndex = leftIndex + 1;
    let earliestIndex = parentIndex;

    if (
      leftIndex < events.length &&
      events[leftIndex].dueDate < events[earliestIndex].dueDate
    ) {
      earliestIndex = leftIndex;
    }

    if (
      rightIndex < events.length &&
      events[rightIndex].dueDate < events[earliestIndex].dueDate
    ) {
      earliestIndex = rightIndex;
    }

    if (earliestIndex === parentIndex) {
      return;
    }

    [events[parentIndex], events[earliestIndex]] = [
      events[earliestIndex],
      events[parentIndex],
    ];
    parentIndex = earliestIndex;
  }
}
