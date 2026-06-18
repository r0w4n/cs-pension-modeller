import type {
  CandidateStrategy,
  OptimiserWithdrawalStrategy,
  OptimisationSearchSpace,
  WithdrawalOrder,
} from "./optimiserTypes";

export type CandidateGenerationResult = {
  candidates: CandidateStrategy[];
  generatedCandidateCount: number;
  warning: string | null;
};

type ContributionOption = {
  monthlySippContribution: number;
  monthlyIsaContribution: number;
  monthlyAddedPensionContribution: number;
};

export function generateCandidateStrategies(
  searchSpace: OptimisationSearchSpace,
  options: {
    normalPensionAge: number;
    nuvosDrawAge: number | null;
    statePensionAge: number | null;
    maxCandidates: number;
  }
): CandidateGenerationResult {
  if (options.maxCandidates <= 0) {
    return {
      candidates: [],
      generatedCandidateCount: 0,
      warning: null,
    };
  }

  const contributionOptions = getContributionOptions(searchSpace);
  const groups = rangeValues(searchSpace.retirementAge).map((retirementAge) => {
    const alphaDrawAges = getAlphaDrawAges({
      retirementAge,
      normalPensionAge: options.normalPensionAge,
      searchSpace,
    });
    const partialRetirementOptions = getPartialRetirementOptions({
      retirementAge,
      searchSpace,
    });
    const count =
      alphaDrawAges.length *
      contributionOptions.length *
      partialRetirementOptions.length *
      searchSpace.withdrawalOrders.length *
      searchSpace.withdrawalStrategies.length;

    return {
      retirementAge,
      alphaDrawAges,
      partialRetirementOptions,
      count,
    };
  });
  const generatedCandidateCount = groups.reduce(
    (total, group) => total + group.count,
    0
  );
  const sampledIndexes = createSampledIndexes(
    generatedCandidateCount,
    options.maxCandidates
  );
  const candidates = sampledIndexes.map((candidateIndex) =>
    createCandidateForGlobalIndex({
      candidateIndex,
      contributionOptions,
      groups,
      searchSpace,
      nuvosDrawAge: options.nuvosDrawAge,
      statePensionAge: options.statePensionAge,
    })
  );

  return {
    candidates,
    generatedCandidateCount,
    warning:
      generatedCandidateCount > options.maxCandidates
        ? `The optimiser capped the search at ${options.maxCandidates.toLocaleString("en-GB")} candidate strategies. Narrow the ranges or increase the steps to search more of the space.`
        : null,
  };
}

type CandidateGroup = {
  retirementAge: number;
  alphaDrawAges: number[];
  partialRetirementOptions: PartialRetirementOption[];
  count: number;
};

type PartialRetirementOption = {
  enabled: boolean;
  startAge: number | null;
  workPercent: number | null;
};

function createSampledIndexes(totalCount: number, maxCandidates: number) {
  const sampleCount = Math.min(totalCount, maxCandidates);

  if (sampleCount <= 0) {
    return [];
  }

  if (sampleCount === totalCount) {
    return Array.from({ length: totalCount }, (_, index) => index);
  }

  const stride = (totalCount - 1) / Math.max(1, sampleCount - 1);

  return Array.from({ length: sampleCount }, (_, index) =>
    Math.round(index * stride)
  );
}

function createCandidateForGlobalIndex(input: {
  candidateIndex: number;
  contributionOptions: ContributionOption[];
  groups: CandidateGroup[];
  searchSpace: OptimisationSearchSpace;
  nuvosDrawAge: number | null;
  statePensionAge: number | null;
}) {
  const withdrawalOrders = input.searchSpace.withdrawalOrders;
  const withdrawalStrategies = input.searchSpace.withdrawalStrategies;
  let localIndex = input.candidateIndex;
  let group = input.groups[0];

  for (const candidateGroup of input.groups) {
    if (localIndex < candidateGroup.count) {
      group = candidateGroup;
      break;
    }

    localIndex -= candidateGroup.count;
  }

  const withdrawalStrategy = pickByIndex(withdrawalStrategies, localIndex);
  localIndex = Math.floor(localIndex / withdrawalStrategies.length);
  const withdrawalOrder = pickByIndex(withdrawalOrders, localIndex);
  localIndex = Math.floor(localIndex / withdrawalOrders.length);
  const partialRetirementOption = pickByIndex(
    group.partialRetirementOptions,
    localIndex
  );
  localIndex = Math.floor(localIndex / group.partialRetirementOptions.length);
  const contributionOption = pickByIndex(input.contributionOptions, localIndex);
  localIndex = Math.floor(localIndex / input.contributionOptions.length);
  const alphaDrawAge = pickByIndex(group.alphaDrawAges, localIndex);

  return createCandidate({
    retirementAge: group.retirementAge,
    alphaDrawAge,
    monthlySippContribution: contributionOption.monthlySippContribution,
    monthlyIsaContribution: contributionOption.monthlyIsaContribution,
    monthlyAddedPensionContribution:
      contributionOption.monthlyAddedPensionContribution,
    withdrawalOrder,
    withdrawalStrategy,
    nuvosDrawAge: input.nuvosDrawAge,
    statePensionAge: input.statePensionAge,
    partialRetirementEnabled: partialRetirementOption.enabled,
    partialRetirementStartAge: partialRetirementOption.startAge,
    partialRetirementWorkPercent: partialRetirementOption.workPercent,
  });
}

function getAddedPensionContributionValues(
  searchSpace: OptimisationSearchSpace
) {
  return rangeValues(
    searchSpace.monthlyAddedPensionContribution ?? {
      min: 0,
      max: 0,
      step: 1,
    }
  );
}

function getContributionOptions(
  searchSpace: OptimisationSearchSpace
): ContributionOption[] {
  const maxTotalMonthlyContribution =
    searchSpace.maxTotalMonthlyContribution ?? Number.POSITIVE_INFINITY;
  const options: ContributionOption[] = [];

  for (const monthlySippContribution of rangeValues(
    searchSpace.monthlySippContribution
  )) {
    for (const monthlyIsaContribution of rangeValues(
      searchSpace.monthlyIsaContribution
    )) {
      for (const monthlyAddedPensionContribution of getAddedPensionContributionValues(
        searchSpace
      )) {
        const totalMonthlyContribution =
          monthlySippContribution +
          monthlyIsaContribution +
          monthlyAddedPensionContribution;

        if (totalMonthlyContribution <= maxTotalMonthlyContribution) {
          options.push({
            monthlySippContribution,
            monthlyIsaContribution,
            monthlyAddedPensionContribution,
          });
        }
      }
    }
  }

  return options;
}

function pickByIndex<T>(values: T[], index: number) {
  return values[index % values.length];
}

function getPartialRetirementOptions(input: {
  retirementAge: number;
  searchSpace: OptimisationSearchSpace;
}) {
  const disabledOption = {
    enabled: false,
    startAge: null,
    workPercent: null,
  };
  const startAgeRange = input.searchSpace.partialRetirementStartAge;
  const workPercentRange = input.searchSpace.partialRetirementWorkPercent;

  if (!startAgeRange || !workPercentRange) {
    return [disabledOption];
  }

  return [
    disabledOption,
    ...rangeValues(startAgeRange)
      .filter((startAge) => startAge < input.retirementAge)
      .flatMap((startAge) =>
        rangeValues(workPercentRange).map((workPercent) => ({
          enabled: true,
          startAge,
          workPercent,
        }))
      ),
  ];
}

function createCandidate(input: {
  retirementAge: number;
  alphaDrawAge: number;
  monthlySippContribution: number;
  monthlyIsaContribution: number;
  monthlyAddedPensionContribution: number;
  withdrawalOrder: WithdrawalOrder;
  withdrawalStrategy: OptimiserWithdrawalStrategy;
  nuvosDrawAge: number | null;
  statePensionAge: number | null;
  partialRetirementEnabled: boolean;
  partialRetirementStartAge: number | null;
  partialRetirementWorkPercent: number | null;
}): CandidateStrategy {
  return {
    id: createCandidateId(input),
    monthlySippContribution: input.monthlySippContribution,
    monthlyIsaContribution: input.monthlyIsaContribution,
    monthlyAddedPensionContribution: input.monthlyAddedPensionContribution,
    retirementAge: input.retirementAge,
    alphaDrawAge: input.alphaDrawAge,
    nuvosDrawAge: input.nuvosDrawAge,
    statePensionAge: input.statePensionAge,
    withdrawalOrder: input.withdrawalOrder,
    withdrawalStrategy: input.withdrawalStrategy,
    partialRetirementEnabled: input.partialRetirementEnabled,
    partialRetirementStartAge: input.partialRetirementStartAge,
    partialRetirementWorkPercent: input.partialRetirementWorkPercent,
  };
}

export function createSearchSpaceAroundStrategies(input: {
  baseSearchSpace: OptimisationSearchSpace;
  strategies: CandidateStrategy[];
  contributionStep: number;
  contributionWindow: number;
}): OptimisationSearchSpace {
  const { baseSearchSpace, strategies, contributionStep, contributionWindow } =
    input;

  if (strategies.length === 0) {
    return baseSearchSpace;
  }

  return {
    ...baseSearchSpace,
    monthlySippContribution: createRefinedRange(
      strategies.map((strategy) => strategy.monthlySippContribution),
      baseSearchSpace.monthlySippContribution,
      contributionWindow,
      contributionStep
    ),
    monthlyIsaContribution: createRefinedRange(
      strategies.map((strategy) => strategy.monthlyIsaContribution),
      baseSearchSpace.monthlyIsaContribution,
      contributionWindow,
      contributionStep
    ),
    monthlyAddedPensionContribution:
      baseSearchSpace.monthlyAddedPensionContribution &&
      createRefinedRange(
        strategies.map((strategy) => strategy.monthlyAddedPensionContribution),
        baseSearchSpace.monthlyAddedPensionContribution,
        Math.min(contributionWindow, 100),
        Math.min(contributionStep, 50)
      ),
    retirementAge: {
      ...baseSearchSpace.retirementAge,
      step: 1,
    },
    alphaDrawAge: {
      ...baseSearchSpace.alphaDrawAge,
      step: 1,
    },
    partialRetirementStartAge: baseSearchSpace.partialRetirementStartAge
      ? {
          ...baseSearchSpace.partialRetirementStartAge,
          step: 1,
        }
      : undefined,
  };
}

function getAlphaDrawAges(input: {
  retirementAge: number;
  normalPensionAge: number;
  searchSpace: OptimisationSearchSpace;
}) {
  const minAge = Math.max(
    input.searchSpace.alphaDrawAge.min,
    input.retirementAge,
    57
  );
  const maxAge = Math.min(
    input.searchSpace.alphaDrawAge.max,
    input.normalPensionAge
  );
  const ages = new Set<number>();

  if (input.retirementAge >= minAge && input.retirementAge <= maxAge) {
    ages.add(input.retirementAge);
  }

  for (
    let age = minAge;
    age <= maxAge;
    age += Math.max(1, input.searchSpace.alphaDrawAge.step)
  ) {
    ages.add(age);
  }

  if (
    input.normalPensionAge >= minAge &&
    input.normalPensionAge <= input.searchSpace.alphaDrawAge.max
  ) {
    ages.add(input.normalPensionAge);
  }

  return [...ages].sort((first, second) => first - second);
}

function rangeValues(range: { min: number; max: number; step: number }) {
  const values: number[] = [];
  const step = Math.max(1, range.step);

  for (let value = range.min; value <= range.max; value += step) {
    values.push(roundCurrency(value));
  }

  if (values.at(-1) !== range.max) {
    values.push(roundCurrency(range.max));
  }

  return [...new Set(values)];
}

function createRefinedRange(
  values: number[],
  baseRange: { min: number; max: number; step: number },
  window: number,
  step: number
) {
  const minValue = Math.max(baseRange.min, Math.min(...values) - window);
  const maxValue = Math.min(baseRange.max, Math.max(...values) + window);

  return {
    min: roundDownToStep(minValue, step),
    max: roundUpToStep(maxValue, step),
    step,
  };
}

function createCandidateId(input: {
  retirementAge: number;
  alphaDrawAge: number;
  monthlySippContribution: number;
  monthlyIsaContribution: number;
  monthlyAddedPensionContribution: number;
  withdrawalOrder: WithdrawalOrder;
  withdrawalStrategy: OptimiserWithdrawalStrategy;
  partialRetirementEnabled: boolean;
  partialRetirementStartAge: number | null;
  partialRetirementWorkPercent: number | null;
}) {
  return [
    `ret-${input.retirementAge}`,
    `alpha-${input.alphaDrawAge}`,
    `sipp-${input.monthlySippContribution}`,
    `isa-${input.monthlyIsaContribution}`,
    `added-${input.monthlyAddedPensionContribution}`,
    input.partialRetirementEnabled
      ? `partial-${input.partialRetirementStartAge}-${input.partialRetirementWorkPercent}`
      : "partial-off",
    input.withdrawalOrder,
    input.withdrawalStrategy,
  ].join("|");
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundDownToStep(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}
