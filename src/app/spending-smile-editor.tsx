import { useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import {
  applyRlsTarget,
  applySpendingSmileProfile,
  classifyRlsTarget,
  getRlsClassificationLabel,
  initializeSpendingSmile,
  retirementLivingStandards,
  switchSpendingSmileInputMode,
  updateGoGoAnnualAmount,
  updatePhaseAnnualAmount,
  updatePhasePercentage,
  type RlsLevel,
} from "../spending-smile";
import {
  formatCurrency,
  type PensionSettings,
  type SpendingSmileStrategy,
} from "../settings";
import type { SettingsFieldOnChange } from "./form-fields";

type PhaseKey = "goGo" | "slowGo" | "noGo";

const phaseDetails = {
  goGo: {
    title: "Go-go years",
    description: "Active early retirement",
  },
  slowGo: {
    title: "Slow-go years",
    description: "Middle retirement",
  },
  noGo: {
    title: "No-go years",
    description: "Later retirement",
  },
} as const;

export function SpendingSmileEditor({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  const [ageError, setAgeError] = useState("");
  const strategy = settings.spendingSmile;
  const enabled = settings.spendingStrategyType === "SPENDING_SMILE";

  function updateStrategy(next: SpendingSmileStrategy) {
    onChange("spendingSmile", next);
  }

  function setStrategyType(type: PensionSettings["spendingStrategyType"]) {
    if (type === "SPENDING_SMILE") {
      updateStrategy(
        initializeSpendingSmile(strategy, settings.desiredRetirementIncome)
      );
      trackAnalyticsEvent("spending_smile_enabled", {
        expert_mode: true,
      });
    } else {
      trackAnalyticsEvent("spending_smile_disabled", {
        expert_mode: true,
      });
    }
    onChange("spendingStrategyType", type);
  }

  function setStartAge(phase: "slowGo" | "noGo", value: number) {
    if (phase === "slowGo" && value <= settings.requirementAge) {
      setAgeError("Slow-go years must start after your retirement age.");
      return;
    }
    if (phase === "slowGo" && value >= strategy.noGoStartAge) {
      setAgeError("Slow-go years must start before the No-go years.");
      return;
    }
    if (phase === "noGo" && value <= strategy.slowGoStartAge) {
      setAgeError("No-go years must start after the Slow-go years.");
      return;
    }

    setAgeError("");
    updateStrategy({
      ...strategy,
      [phase === "slowGo" ? "slowGoStartAge" : "noGoStartAge"]: value,
    });
    trackAnalyticsEvent("spending_smile_phase_age_changed", {
      phase,
      expert_mode: true,
    });
  }

  function applyRls(phase: PhaseKey, level: RlsLevel) {
    updateStrategy(applyRlsTarget(strategy, phase, level));
    trackAnalyticsEvent("spending_smile_rls_target_applied", {
      phase,
      rls_level: level,
      household_type: strategy.householdType,
      expert_mode: true,
    });
  }

  return (
    <section className="spending-smile-editor" aria-labelledby="spending-title">
      <div className="spending-smile-heading">
        <p className="eyebrow">Expert feature</p>
        <h3 id="spending-title">Spending strategy</h3>
        <p className="section-copy">
          Choose a flat target or set different spending targets for your
          active, middle and later retirement years.
        </p>
      </div>

      <fieldset className="spending-strategy-options">
        <legend className="field-label">Spending strategy</legend>
        <label className="checkbox-row">
          <input
            type="radio"
            name="spending-strategy"
            value="FLAT"
            checked={!enabled}
            onChange={() => setStrategyType("FLAT")}
          />
          <span>Flat spending</span>
        </label>
        <label className="checkbox-row">
          <input
            type="radio"
            name="spending-strategy"
            value="SPENDING_SMILE"
            checked={enabled}
            onChange={() => setStrategyType("SPENDING_SMILE")}
          />
          <span>Spending Smile — Expert</span>
        </label>
      </fieldset>

      {enabled ? (
        <>
          <p className="section-copy">
            Go-go years represent active early retirement, Slow-go years
            represent middle retirement, and No-go years represent later
            retirement. You can change both the ages and spending assumptions.
          </p>

          <div className="spending-smile-toolbar">
            <fieldset className="segmented-control">
              <legend className="field-label">Enter spending as</legend>
              <label>
                <input
                  type="radio"
                  name="spending-input-mode"
                  checked={strategy.inputMode === "ANNUAL_AMOUNT"}
                  onChange={() => {
                    updateStrategy(
                      switchSpendingSmileInputMode(strategy, "ANNUAL_AMOUNT")
                    );
                    trackAnalyticsEvent("spending_smile_input_mode_changed", {
                      input_mode: "ANNUAL_AMOUNT",
                      expert_mode: true,
                    });
                  }}
                />
                <span>Annual amounts</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="spending-input-mode"
                  checked={strategy.inputMode === "PERCENTAGE_OF_GO_GO"}
                  onChange={() => {
                    updateStrategy(
                      switchSpendingSmileInputMode(
                        strategy,
                        "PERCENTAGE_OF_GO_GO"
                      )
                    );
                    trackAnalyticsEvent("spending_smile_input_mode_changed", {
                      input_mode: "PERCENTAGE_OF_GO_GO",
                      expert_mode: true,
                    });
                  }}
                />
                <span>Percentages</span>
              </label>
            </fieldset>

            <label className="spending-smile-household">
              <span className="field-label">RLS household type</span>
              <select
                value={strategy.householdType}
                onChange={(event) =>
                  updateStrategy({
                    ...strategy,
                    householdType:
                      event.target.value === "TWO_PERSON"
                        ? "TWO_PERSON"
                        : "ONE_PERSON",
                  })
                }
              >
                <option value="ONE_PERSON">One-person household</option>
                <option value="TWO_PERSON">Two-person household</option>
              </select>
            </label>
          </div>

          <p className="field-help">
            Retirement Living Standards are household expenditure figures.
            Select the household type whose costs you are modelling.
          </p>

          <div className="spending-smile-presets">
            <span className="field-label">Profile presets</span>
            <div className="spending-smile-actions">
              <ProfileButton
                label="Existing target with reductions"
                onClick={() =>
                  applyProfile(
                    "EXISTING_REDUCTIONS",
                    strategy,
                    settings,
                    updateStrategy
                  )
                }
              />
              <ProfileButton
                label="RLS tiered profile"
                onClick={() =>
                  applyProfile("RLS_TIERED", strategy, settings, updateStrategy)
                }
              />
              <ProfileButton
                label="Moderate profile"
                onClick={() =>
                  applyProfile("MODERATE", strategy, settings, updateStrategy)
                }
              />
            </div>
            <p className="field-help">
              These profiles are illustrative starting points, not
              recommendations.
            </p>
          </div>

          {ageError ? (
            <p className="validation-message" role="alert">
              {ageError}
            </p>
          ) : null}

          <div className="spending-phase-grid">
            {(["goGo", "slowGo", "noGo"] as const).map((phase) => (
              <SpendingPhaseCard
                key={phase}
                phase={phase}
                settings={settings}
                strategy={strategy}
                onStrategyChange={updateStrategy}
                onStartAgeChange={setStartAge}
                onApplyRls={applyRls}
              />
            ))}
          </div>

          <SpendingProfileChart settings={settings} strategy={strategy} />

          {isIncreasingProfile(strategy) ? (
            <p className="spending-smile-warning">
              Later-phase spending is higher than earlier-phase spending. This
              is valid, but it does not form a conventional spending smile.
            </p>
          ) : null}

          <p className="spending-smile-warning">
            Pensions UK/Loughborough University Retirement Living Standards
            exclude rent and mortgage payments. Add any expected housing costs
            to your target.
          </p>

          <p className="visually-hidden" aria-live="polite">
            Slow-go spending is{" "}
            {formatCurrency(strategy.slowGo.annualAmountReal)} per year. No-go
            spending is {formatCurrency(strategy.noGo.annualAmountReal)} per
            year.
          </p>
        </>
      ) : null}
    </section>
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
  const maximumTarget = Math.max(
    1,
    strategy.goGo.annualAmountReal,
    strategy.slowGo.annualAmountReal,
    strategy.noGo.annualAmountReal
  );
  const x = (age: number) =>
    24 +
    ((Math.min(endAge, Math.max(startAge, age)) - startAge) / ageSpan) * 452;
  const y = (amount: number) => 150 - (amount / maximumTarget) * 118;
  const slowX = x(strategy.slowGoStartAge);
  const noX = x(strategy.noGoStartAge);
  const endX = x(endAge);
  const slowGoReached = strategy.slowGoStartAge <= endAge;
  const noGoReached = strategy.noGoStartAge <= endAge;
  const path = [
    `M 24 ${y(strategy.goGo.annualAmountReal)}`,
    ...(slowGoReached
      ? [`H ${slowX}`, `V ${y(strategy.slowGo.annualAmountReal)}`]
      : []),
    ...(noGoReached
      ? [`H ${noX}`, `V ${y(strategy.noGo.annualAmountReal)}`]
      : []),
    `H ${endX}`,
  ].join(" ");

  return (
    <figure className="spending-profile-chart">
      <figcaption>
        <strong>Modelled spending profile</strong>
        <span> Annual spending in today&apos;s money by age</span>
      </figcaption>
      <svg
        viewBox="0 0 500 190"
        role="img"
        aria-labelledby="spending-profile-title spending-profile-description"
      >
        <title id="spending-profile-title">Spending Smile profile</title>
        <desc id="spending-profile-description">
          Go-go spending is {formatCurrency(strategy.goGo.annualAmountReal)}{" "}
          from age {startAge}, Slow-go spending is{" "}
          {formatCurrency(strategy.slowGo.annualAmountReal)} from age{" "}
          {strategy.slowGoStartAge}, and No-go spending is{" "}
          {formatCurrency(strategy.noGo.annualAmountReal)} from age{" "}
          {strategy.noGoStartAge}.
        </desc>
        <line className="profile-axis" x1="24" x2="476" y1="150" y2="150" />
        {slowGoReached ? (
          <line
            data-testid="spending-phase-boundary"
            className="profile-boundary"
            x1={slowX}
            x2={slowX}
            y1="24"
            y2="150"
          />
        ) : null}
        {noGoReached ? (
          <line
            data-testid="spending-phase-boundary"
            className="profile-boundary"
            x1={noX}
            x2={noX}
            y1="24"
            y2="150"
          />
        ) : null}
        <path className="profile-target-line" d={path} />
        <text x="24" y="174">
          {startAge}
        </text>
        {slowGoReached ? (
          <text textAnchor="middle" x={slowX} y="174">
            {strategy.slowGoStartAge}
          </text>
        ) : null}
        {noGoReached ? (
          <text textAnchor="middle" x={noX} y="174">
            {strategy.noGoStartAge}
          </text>
        ) : null}
        <text textAnchor="end" x="476" y="174">
          {endAge}
        </text>
      </svg>
    </figure>
  );
}

function SpendingPhaseCard({
  phase,
  settings,
  strategy,
  onStrategyChange,
  onStartAgeChange,
  onApplyRls,
}: {
  phase: PhaseKey;
  settings: PensionSettings;
  strategy: SpendingSmileStrategy;
  onStrategyChange: (strategy: SpendingSmileStrategy) => void;
  onStartAgeChange: (phase: "slowGo" | "noGo", value: number) => void;
  onApplyRls: (phase: PhaseKey, level: RlsLevel) => void;
}) {
  const target = strategy[phase];
  const startAge =
    phase === "goGo"
      ? settings.requirementAge
      : phase === "slowGo"
        ? strategy.slowGoStartAge
        : strategy.noGoStartAge;
  const endAge =
    phase === "goGo"
      ? strategy.slowGoStartAge - 1
      : phase === "slowGo"
        ? strategy.noGoStartAge - 1
        : settings.lifeExpectancy;
  const notReached = startAge > settings.lifeExpectancy;
  const classification = classifyRlsTarget(
    target.annualAmountReal,
    strategy.householdType
  );

  return (
    <section className="field-card spending-phase-card">
      <h4>{phaseDetails[phase].title}</h4>
      <p>{phaseDetails[phase].description}</p>

      {phase === "goGo" ? (
        <p className="spending-phase-range">
          Starts at your retirement age: {settings.requirementAge}
        </p>
      ) : (
        <label className="spending-phase-field">
          <span>Starts at age</span>
          <input
            type="number"
            aria-label={`${phaseDetails[phase].title} starts at age`}
            min={settings.requirementAge + 1}
            max={120}
            step={1}
            value={startAge}
            onChange={(event) =>
              onStartAgeChange(phase, Number(event.target.value))
            }
          />
        </label>
      )}

      <p className="spending-phase-range">
        {notReached
          ? "This phase starts after the end of the current projection."
          : `Age ${startAge} to ${endAge}`}
      </p>

      {phase === "goGo" || strategy.inputMode === "ANNUAL_AMOUNT" ? (
        <label className="spending-phase-field">
          <span>
            {phaseDetails[phase].title.replace(" years", "")} annual spending
          </span>
          <span className="currency-input-control">
            <span aria-hidden="true">£</span>
            <input
              type="number"
              min={0}
              max={200000}
              step={100}
              value={target.annualAmountReal}
              onChange={(event) => {
                const amount = Number(event.target.value);
                onStrategyChange(
                  phase === "goGo"
                    ? updateGoGoAnnualAmount(strategy, amount)
                    : updatePhaseAnnualAmount(strategy, phase, amount)
                );
              }}
            />
          </span>
        </label>
      ) : (
        <label className="spending-phase-field">
          <span>
            {phaseDetails[phase].title.replace(" years", "")} percentage of
            Go-go spending
          </span>
          <span className="percentage-input-control">
            <input
              type="number"
              min={0}
              max={300}
              step={1}
              value={roundPercentage(target.percentageOfGoGo)}
              onChange={(event) =>
                onStrategyChange(
                  updatePhasePercentage(
                    strategy,
                    phase,
                    Number(event.target.value)
                  )
                )
              }
            />
            <span aria-hidden="true">%</span>
          </span>
        </label>
      )}

      <p className="spending-phase-derived">
        {phase === "goGo"
          ? "100% of Go-go spending"
          : strategy.inputMode === "ANNUAL_AMOUNT"
            ? `${roundPercentage(target.percentageOfGoGo)}% of Go-go spending`
            : `${formatCurrency(target.annualAmountReal)} per year`}
      </p>
      <p className="spending-phase-classification">
        {getRlsClassificationLabel(classification)}
      </p>
      {classification === "BELOW_MINIMUM" ? (
        <p className="spending-smile-warning">
          This target is below the current Retirement Living Standards Minimum
          for the selected household type. The standard also excludes rent and
          mortgage costs.
        </p>
      ) : null}

      <div className="spending-phase-presets">
        <span className="field-label">Use RLS target</span>
        <div className="spending-smile-actions">
          {(["minimum", "moderate", "comfortable"] as const).map((level) => (
            <button
              key={level}
              type="button"
              className="secondary-button"
              onClick={() => onApplyRls(phase, level)}
            >
              {capitalize(level)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="secondary-button" onClick={onClick}>
      {label}
    </button>
  );
}

function applyProfile(
  profile: "EXISTING_REDUCTIONS" | "RLS_TIERED" | "MODERATE",
  strategy: SpendingSmileStrategy,
  settings: PensionSettings,
  onStrategyChange: (strategy: SpendingSmileStrategy) => void
) {
  onStrategyChange(
    applySpendingSmileProfile(
      strategy,
      profile,
      settings.desiredRetirementIncome
    )
  );
  trackAnalyticsEvent("spending_smile_profile_preset_applied", {
    preset: profile,
    household_type: strategy.householdType,
    expert_mode: true,
  });
}

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function isIncreasingProfile(strategy: SpendingSmileStrategy) {
  return (
    strategy.slowGo.annualAmountReal > strategy.goGo.annualAmountReal ||
    strategy.noGo.annualAmountReal > strategy.slowGo.annualAmountReal
  );
}

export const currentRetirementLivingStandards =
  retirementLivingStandards.values;
