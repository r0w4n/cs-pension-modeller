import { useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import {
  calculateSmilePhaseTarget,
  getSpendingSmileStartAgeBounds,
  MAX_SPENDING_SMILE_PERCENTAGE,
  MIN_SPENDING_SMILE_PERCENTAGE,
  updateSpendingSmileStartAge,
  updateSpendingSmilePercentage,
  type SmilePercentageField,
} from "../spending-smile";
import {
  formatCurrency,
  type PensionSettings,
  type PensionValidationIssue,
  type SpendingSmileStrategy,
} from "../settings";
import type { SettingsFieldOnChange } from "./form-fields";
import {
  FieldValidationMessages,
  getFieldCardClassName,
} from "./form-fields-shared";

type PhaseKey = "goGo" | "slowGo" | "noGo";

const phaseDetails = {
  goGo: {
    title: "Go-go years",
    description: "Active early retirement",
    percentageField: "goGoPercentage",
  },
  slowGo: {
    title: "Slow-go years",
    description: "Middle retirement",
    percentageField: "slowGoPercentage",
  },
  noGo: {
    title: "No-go years",
    description: "Later retirement",
    percentageField: "noGoPercentage",
  },
} as const satisfies Record<
  PhaseKey,
  {
    title: string;
    description: string;
    percentageField: SmilePercentageField;
  }
>;

export function SpendingSmileEditor({
  settings,
  validationIssues,
  onChange,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
}) {
  const strategy = settings.spendingSmile;
  const enabled = settings.spendingStrategyType === "SPENDING_SMILE";
  const smileValidationIssues = validationIssues.filter(
    (issue) => issue.field === "spendingSmile"
  );

  function updateStrategy(next: SpendingSmileStrategy) {
    onChange("spendingSmile", next);
  }

  function setStrategyType(type: PensionSettings["spendingStrategyType"]) {
    trackAnalyticsEvent(
      type === "SPENDING_SMILE"
        ? "spending_smile_enabled"
        : "spending_smile_disabled",
      { expert_mode: true }
    );
    onChange("spendingStrategyType", type);
  }

  function setStartAge(phase: "slowGo" | "noGo", value: number) {
    updateStrategy(
      updateSpendingSmileStartAge(
        strategy,
        phase === "slowGo" ? "slowGoStartAge" : "noGoStartAge",
        value,
        settings.requirementAge,
        settings.lifeExpectancy
      )
    );
    trackAnalyticsEvent("spending_smile_phase_age_changed", {
      phase,
      expert_mode: true,
    });
  }

  return (
    <div className="spending-smile-editor">
      <div className="field-card spending-strategy-field">
        <label className="field-label" htmlFor="spending-strategy">
          Spending strategy
        </label>
        <select
          id="spending-strategy"
          className="select-input"
          value={settings.spendingStrategyType}
          onChange={(event) =>
            setStrategyType(
              event.target.value === "SPENDING_SMILE"
                ? "SPENDING_SMILE"
                : "FLAT"
            )
          }
        >
          <option value="FLAT">Flat spending</option>
          <option value="SPENDING_SMILE">SMILE spending</option>
        </select>
        <p className="field-description">
          Choose whether your retirement income target remains level or reduces
          during the later stages of retirement.
        </p>
      </div>

      {enabled ? (
        <>
          <SpendingPhaseCard
            phase="goGo"
            settings={settings}
            strategy={strategy}
            validationIssues={smileValidationIssues}
            onStrategyChange={updateStrategy}
            onStartAgeChange={setStartAge}
          />

          {(["slowGo", "noGo"] as const).map((phase) => (
            <SpendingPhaseCard
              key={phase}
              phase={phase}
              settings={settings}
              strategy={strategy}
              validationIssues={smileValidationIssues}
              onStrategyChange={updateStrategy}
              onStartAgeChange={setStartAge}
            />
          ))}

          <div className="spending-smile-configuration">
            <SpendingProfileChart settings={settings} strategy={strategy} />

            {isIncreasingProfile(strategy) ? (
              <p className="spending-smile-warning">
                A later phase uses a higher percentage than the phase before it.
                This is valid, but it does not form a conventional spending
                smile.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SpendingPhaseCard({
  phase,
  settings,
  strategy,
  validationIssues,
  onStrategyChange,
  onStartAgeChange,
}: {
  phase: PhaseKey;
  settings: PensionSettings;
  strategy: SpendingSmileStrategy;
  validationIssues: PensionValidationIssue[];
  onStrategyChange: (strategy: SpendingSmileStrategy) => void;
  onStartAgeChange: (phase: "slowGo" | "noGo", value: number) => void;
}) {
  const details = phaseDetails[phase];
  const percentage = strategy[details.percentageField];
  const [draftPercentage, setDraftPercentage] = useState<number | null>(null);
  const displayedPercentage = draftPercentage ?? percentage;
  const validationItemIds =
    phase === "goGo"
      ? ["goGoPercentage"]
      : phase === "slowGo"
        ? ["slowGoStartAge", "slowGoPercentage"]
        : ["noGoStartAge", "noGoPercentage"];
  const phaseValidationIssues = validationIssues.filter(
    (issue) => issue.itemId && validationItemIds.includes(issue.itemId)
  );
  const validationId =
    phaseValidationIssues.length > 0
      ? `spending-smile-${phase}-validation`
      : undefined;
  const startAge =
    phase === "goGo"
      ? settings.requirementAge
      : phase === "slowGo"
        ? strategy.slowGoStartAge
        : strategy.noGoStartAge;
  const [draftStartAge, setDraftStartAge] = useState<number | null>(null);
  const displayedStartAge =
    phase === "goGo" ? startAge : (draftStartAge ?? startAge);
  const endAge =
    phase === "goGo"
      ? strategy.slowGoStartAge - 1
      : phase === "slowGo"
        ? strategy.noGoStartAge - 1
        : settings.lifeExpectancy;
  const notReached = startAge > settings.lifeExpectancy;
  const calculatedTarget = calculateSmilePhaseTarget(
    settings.desiredRetirementIncome,
    percentage
  );
  const startAgeBounds = getPhaseStartAgeBounds(phase, strategy, settings);
  const minimumStartAge = startAgeBounds.min;
  const maximumStartAge = startAgeBounds.max;
  const sliderStartAge = Math.min(
    maximumStartAge,
    Math.max(minimumStartAge, displayedStartAge)
  );

  function commitStartAge(value: number) {
    setDraftStartAge(null);
    if (phase === "goGo" || value === startAge) {
      return;
    }
    onStartAgeChange(phase, value);
  }

  function commitPercentage(value: number) {
    setDraftPercentage(null);
    const nextStrategy = updateSpendingSmilePercentage(
      strategy,
      details.percentageField,
      value
    );
    if (nextStrategy[details.percentageField] === percentage) {
      return;
    }
    onStrategyChange(nextStrategy);
  }

  return (
    <section
      className={`${getFieldCardClassName(
        false,
        false,
        phaseValidationIssues.length > 0
      )} spending-phase-card`}
    >
      <h4>
        {details.title} ({details.description})
      </h4>

      {phase === "goGo" ? (
        <p className="spending-phase-range">
          Starts at your retirement age: {settings.requirementAge}
        </p>
      ) : (
        <div className="spending-phase-field">
          <span>Start age</span>
          <div className="range-control-grid">
            <div className="range-slider-group">
              <input
                className="range-input"
                type="range"
                aria-label={`${details.title} start age`}
                aria-valuetext={`Age ${displayedStartAge}`}
                min={minimumStartAge}
                max={maximumStartAge}
                step={1}
                value={sliderStartAge}
                aria-invalid={phaseValidationIssues.length > 0 || undefined}
                aria-describedby={validationId}
                onChange={(event) =>
                  setDraftStartAge(Number(event.target.value))
                }
                onPointerUp={(event) =>
                  commitStartAge(Number(event.currentTarget.value))
                }
                onKeyUp={(event) =>
                  commitStartAge(Number(event.currentTarget.value))
                }
                onBlur={(event) =>
                  commitStartAge(Number(event.currentTarget.value))
                }
              />
              <div className="range-scale">
                <span>Age {minimumStartAge}</span>
                <span>Age {maximumStartAge}</span>
              </div>
            </div>
            <input
              className="number-input"
              type="number"
              aria-label={`${details.title} start age exact value`}
              min={minimumStartAge}
              max={maximumStartAge}
              step={1}
              value={displayedStartAge}
              aria-invalid={phaseValidationIssues.length > 0 || undefined}
              aria-describedby={validationId}
              onChange={(event) => {
                const value = Number(event.target.value);
                setDraftStartAge(value);
                commitStartAge(value);
              }}
            />
          </div>
        </div>
      )}

      <p className="spending-phase-range">
        {notReached
          ? "This phase starts after the end of the current projection."
          : `Age ${startAge} to ${endAge}`}
      </p>

      <div className="spending-phase-field">
        <span>Percentage of Retirement Living Standards target</span>
        <div className="range-control-grid">
          <div className="range-slider-group">
            <input
              className="range-input"
              type="range"
              aria-label={`${details.title} percentage of Retirement Living Standards target`}
              aria-valuetext={`${displayedPercentage}%`}
              min={MIN_SPENDING_SMILE_PERCENTAGE}
              max={MAX_SPENDING_SMILE_PERCENTAGE}
              step={1}
              value={Math.max(
                MIN_SPENDING_SMILE_PERCENTAGE,
                displayedPercentage
              )}
              aria-invalid={phaseValidationIssues.length > 0 || undefined}
              aria-describedby={validationId}
              onChange={(event) =>
                setDraftPercentage(Number(event.target.value))
              }
              onPointerUp={(event) =>
                commitPercentage(Number(event.currentTarget.value))
              }
              onKeyUp={(event) =>
                commitPercentage(Number(event.currentTarget.value))
              }
              onBlur={(event) =>
                commitPercentage(Number(event.currentTarget.value))
              }
            />
            <div className="range-scale">
              <span>{MIN_SPENDING_SMILE_PERCENTAGE}%</span>
              <span>{MAX_SPENDING_SMILE_PERCENTAGE}%</span>
            </div>
          </div>
          <input
            className="number-input"
            type="number"
            aria-label={`${details.title} percentage exact value`}
            min={MIN_SPENDING_SMILE_PERCENTAGE}
            max={MAX_SPENDING_SMILE_PERCENTAGE}
            step={1}
            value={displayedPercentage}
            aria-invalid={phaseValidationIssues.length > 0 || undefined}
            aria-describedby={validationId}
            onChange={(event) => {
              const value = Number(event.target.value);
              setDraftPercentage(value);
              commitPercentage(value);
            }}
          />
        </div>
      </div>

      <p className="spending-phase-derived">
        {percentage}% of your selected retirement income target:{" "}
        <strong>{formatCurrency(calculatedTarget)} per year</strong>
      </p>
      <FieldValidationMessages
        id={validationId}
        issues={phaseValidationIssues}
      />
    </section>
  );
}

function getPhaseStartAgeBounds(
  phase: PhaseKey,
  strategy: SpendingSmileStrategy,
  settings: PensionSettings
) {
  const minimumStartAge = Math.floor(settings.requirementAge) + 1;

  if (phase === "goGo") {
    return { min: minimumStartAge, max: minimumStartAge };
  }

  return getSpendingSmileStartAgeBounds(
    strategy,
    phase === "slowGo" ? "slowGoStartAge" : "noGoStartAge",
    settings.requirementAge,
    settings.lifeExpectancy
  );
}

function SpendingProfileChart({
  settings,
  strategy,
}: {
  settings: PensionSettings;
  strategy: SpendingSmileStrategy;
}) {
  const startAge = settings.requirementAge;
  const endAge = Math.max(startAge + 1, settings.lifeExpectancy);
  const ageSpan = endAge - startAge;
  const phaseTargets = {
    goGo: calculateSmilePhaseTarget(
      settings.desiredRetirementIncome,
      strategy.goGoPercentage
    ),
    slowGo: calculateSmilePhaseTarget(
      settings.desiredRetirementIncome,
      strategy.slowGoPercentage
    ),
    noGo: calculateSmilePhaseTarget(
      settings.desiredRetirementIncome,
      strategy.noGoPercentage
    ),
  };
  const maximumTarget = Math.max(
    0,
    phaseTargets.goGo,
    phaseTargets.slowGo,
    phaseTargets.noGo
  );
  const yAxis = createProfileYAxis(maximumTarget);
  const plotLeft = 76;
  const plotRight = 476;
  const plotTop = 32;
  const plotBottom = 150;
  const x = (age: number) =>
    plotLeft +
    ((Math.min(endAge, Math.max(startAge, age)) - startAge) / ageSpan) *
      (plotRight - plotLeft);
  const y = (target: number) =>
    plotBottom - (target / yAxis.maximum) * (plotBottom - plotTop);
  const slowX = x(strategy.slowGoStartAge);
  const noX = x(strategy.noGoStartAge);
  const endX = x(endAge);
  const xAxisTicks = createProfileXAxisTicks(startAge, endAge);
  const slowGoReached = strategy.slowGoStartAge <= endAge;
  const noGoReached = strategy.noGoStartAge <= endAge;
  const path = [
    `M ${plotLeft} ${y(phaseTargets.goGo)}`,
    ...(slowGoReached ? [`H ${slowX}`, `V ${y(phaseTargets.slowGo)}`] : []),
    ...(noGoReached ? [`H ${noX}`, `V ${y(phaseTargets.noGo)}`] : []),
    `H ${endX}`,
  ].join(" ");

  return (
    <figure className="spending-profile-chart">
      <figcaption>
        <strong>Modelled SMILE profile</strong>
        <span>Annual spending target (£ per year) by age</span>
      </figcaption>
      <svg
        viewBox="0 0 500 190"
        role="img"
        aria-labelledby="spending-profile-title spending-profile-description"
      >
        <title id="spending-profile-title">SMILE spending profile</title>
        <desc id="spending-profile-description">
          Go-go annual spending is {formatCurrency(phaseTargets.goGo)} from age{" "}
          {startAge}, Slow-go annual spending is{" "}
          {formatCurrency(phaseTargets.slowGo)} from age{" "}
          {strategy.slowGoStartAge}, and No-go annual spending is{" "}
          {formatCurrency(phaseTargets.noGo)} from age {strategy.noGoStartAge}.
        </desc>
        <g data-testid="spending-profile-y-axis" aria-hidden="true">
          {yAxis.ticks.map((tick) => {
            const tickY = y(tick);

            return (
              <g key={tick} data-testid="spending-profile-y-axis-tick">
                <line
                  className="profile-y-axis-grid-line"
                  x1={plotLeft}
                  x2={plotRight}
                  y1={tickY}
                  y2={tickY}
                />
                <text
                  className="profile-y-axis-label"
                  textAnchor="end"
                  x={plotLeft - 8}
                  y={tickY + 4}
                >
                  {formatCurrency(tick)}
                </text>
              </g>
            );
          })}
          <line
            className="profile-axis"
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotBottom}
          />
        </g>
        <line
          className="profile-axis"
          x1={plotLeft}
          x2={plotRight}
          y1={plotBottom}
          y2={plotBottom}
        />
        <g data-testid="spending-profile-x-axis" aria-hidden="true">
          {xAxisTicks.map((tick) => {
            const tickX = x(tick);

            return (
              <g
                key={tick}
                data-age={tick}
                data-testid="spending-profile-x-axis-tick"
              >
                <line
                  className="profile-axis"
                  x1={tickX}
                  x2={tickX}
                  y1={plotBottom}
                  y2={plotBottom + 5}
                />
                <text textAnchor="middle" x={tickX} y="174">
                  {tick}
                </text>
              </g>
            );
          })}
        </g>
        {slowGoReached ? (
          <line
            data-testid="spending-phase-boundary"
            className="profile-boundary"
            x1={slowX}
            x2={slowX}
            y1={plotTop}
            y2={plotBottom}
          />
        ) : null}
        {noGoReached ? (
          <line
            data-testid="spending-phase-boundary"
            className="profile-boundary"
            x1={noX}
            x2={noX}
            y1={plotTop}
            y2={plotBottom}
          />
        ) : null}
        <path className="profile-target-line" d={path} />
      </svg>
    </figure>
  );
}

function createProfileXAxisTicks(startAge: number, endAge: number) {
  const interval = 5;
  const firstTick = Math.ceil(startAge / interval) * interval;
  const lastTick = Math.floor(endAge / interval) * interval;

  if (firstTick > lastTick) {
    return [];
  }

  return Array.from(
    { length: (lastTick - firstTick) / interval + 1 },
    (_, index) => firstTick + index * interval
  );
}

function createProfileYAxis(maximumTarget: number) {
  if (maximumTarget <= 0) {
    return { maximum: 1, ticks: [0] };
  }

  const targetIntervals = 5;
  const roughIncrement = maximumTarget / targetIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(roughIncrement));
  const normalizedIncrement = roughIncrement / magnitude;
  const incrementMultiplier =
    normalizedIncrement <= 1
      ? 1
      : normalizedIncrement <= 2
        ? 2
        : normalizedIncrement <= 5
          ? 5
          : 10;
  const increment = incrementMultiplier * magnitude;
  const maximum = Math.ceil(maximumTarget / increment) * increment;
  const intervalCount = Math.round(maximum / increment);
  const ticks = Array.from(
    { length: intervalCount + 1 },
    (_, index) => maximum - index * increment
  );

  return { maximum, ticks };
}

function isIncreasingProfile(strategy: SpendingSmileStrategy) {
  return (
    strategy.slowGoPercentage > strategy.goGoPercentage ||
    strategy.noGoPercentage > strategy.slowGoPercentage
  );
}
