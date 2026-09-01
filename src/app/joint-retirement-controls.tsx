import {
  createDefaultPartnerSettings,
  type PartnerSettings,
  type PensionSettings,
  type PensionValidationIssue,
  type SpendingSmileStrategy,
} from "../settings";
import { addYears } from "../projection";
import { TWO_PERSON_RETIREMENT_LIVING_STANDARDS } from "../data/retirement-living-standards";
import {
  fieldGroups,
  type CurrencyInputField,
  type RangeField,
} from "../fieldDefinitions";
import { OPTIONAL_SECTION_TOGGLES } from "../app-domains";
import type { SettingsFieldOnChange } from "./form-fields";
import { CurrencySettingField, RangeSettingField } from "./form-field-values";
import { CheckboxFieldGrid } from "./optional-section-toggle-grid";
import { SpendingSmileEditor } from "./spending-smile-editor";
import {
  getHouseholdFlexibleFundAccountLabel,
  getHouseholdFlexibleWithdrawalNonPriorityAccounts,
  getHouseholdFlexibleWithdrawalPriorityAccounts,
  getHouseholdWithdrawalStrategy,
  getWithdrawalStrategyFieldId,
  shouldShowHouseholdFlexibleWithdrawalPriority,
  splitHouseholdFlexibleFundAccountId,
} from "../result-projection/flexible-withdrawals";
import { FundingPriorityEditor } from "./flexible-withdrawal-priority-editor";
import { applyPartnerSettingsFieldChange } from "./chart-state";

const RETIREMENT_AGE_FIELD = getSharedRangeField("requirementAge");
const FULL_SALARY_FIELD = getSharedRangeField("fullSalary");
const RETIREMENT_TARGET_FIELD = getSharedCurrencyField(
  "desiredRetirementIncome"
);
const LUMP_SUM_ALLOWANCE_FIELD = getSharedCurrencyField("taxLumpSumAllowance");
const LUMP_SUM_ALLOWANCE_USED_FIELD = getSharedCurrencyField(
  "taxLumpSumAllowanceUsed"
);

export function JointRetirementToggle({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  const enabled = settings.jointRetirement.enabled;

  return (
    <section
      className="settings-section"
      aria-labelledby="joint-retirement-heading"
    >
      <div className="section-heading">
        <h3 id="joint-retirement-heading">Model retirement for two people</h3>
        <p className="section-copy">
          Add a partner and model pensions, savings, tax and retirement dates
          separately, then assess your combined household income.
        </p>
      </div>
      <CheckboxFieldGrid
        items={[
          {
            id: "joint-retirement-enabled",
            label: "Model retirement for two people",
            description:
              "Add a Partner and assess the combined household income against shared spending targets.",
            checked: enabled,
            onChange: (nextEnabled) => {
              const isFirstEnable = nextEnabled && !settings.partner;
              onChange("jointRetirement", {
                ...settings.jointRetirement,
                enabled: nextEnabled,
                transitionDesiredRetirementIncome: isFirstEnable
                  ? settings.desiredRetirementIncome
                  : settings.jointRetirement.transitionDesiredRetirementIncome,
                fullyRetiredDesiredRetirementIncome: isFirstEnable
                  ? settings.desiredRetirementIncome
                  : settings.jointRetirement
                      .fullyRetiredDesiredRetirementIncome,
              });
              if (nextEnabled && !settings.partner) {
                onChange("partner", createDefaultPartnerSettings());
              }
            },
          },
        ]}
      />
    </section>
  );
}

export function PartnerOptionalSections({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  if (!settings.jointRetirement.enabled || !settings.partner) {
    return null;
  }
  const partner = settings.partner;

  return (
    <section
      className="settings-section"
      aria-labelledby="partner-optional-sections-heading"
    >
      <div className="section-heading">
        <h3 id="partner-optional-sections-heading">
          Partner optional sections
        </h3>
        <p className="section-copy">
          Select each source that applies to Partner. Unselected values stay
          saved but are not used in the household calculation.
        </p>
      </div>
      <CheckboxFieldGrid
        items={OPTIONAL_SECTION_TOGGLES.map((toggle) => ({
          id: `partner-${toggle.key}`,
          label: `Partner ${toggle.label}`,
          description: toggle.description,
          checked: partner[toggle.key] === true,
          onChange: (checked) =>
            onChange("partner", { ...partner, [toggle.key]: checked }),
        }))}
      />
    </section>
  );
}

export function JointHouseholdTargetFields({
  settings,
  onChange,
  showGuidanceNotes,
  showSpendingSmileEditor = false,
  validationIssues = [],
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
  showSpendingSmileEditor?: boolean;
  validationIssues?: PensionValidationIssue[];
}) {
  if (!settings.jointRetirement.enabled || !settings.partner) {
    return null;
  }
  const partner = settings.partner;
  const updateJoint = (patch: Partial<PensionSettings["jointRetirement"]>) =>
    onChange("jointRetirement", { ...settings.jointRetirement, ...patch });

  const retirementMonths = getRetirementMonths(settings, partner);
  const hasTransitionPeriod = retirementMonths.you !== retirementMonths.partner;
  const transitionLabel =
    retirementMonths.you < retirementMonths.partner
      ? "Household target from your retirement until Partner retires"
      : "Household target from Partner's retirement until you retire";

  return (
    <section
      className="settings-section"
      aria-labelledby="household-target-heading"
    >
      <div className="section-heading">
        <h3 id="household-target-heading">
          Household retirement income target
        </h3>
        <p className="section-copy">
          These are annual household spending targets after estimated Income
          Tax. The model does not split them between you and Partner.
        </p>
      </div>
      <div className="field-grid">
        <RangeSettingField
          field={{ ...RETIREMENT_AGE_FIELD, label: "Your retirement age" }}
          value={settings.requirementAge}
          settings={settings}
          onChange={(_, value) => onChange("requirementAge", value as number)}
          showGuidanceNotes={showGuidanceNotes}
          useNpaLinkedDefaults
          domIdPrefix="you-household-retirement"
        />
        <RangeSettingField
          field={{ ...RETIREMENT_AGE_FIELD, label: "Partner retirement age" }}
          value={partner.requirementAge}
          settings={partner as PensionSettings}
          onChange={(_, value) =>
            onChange(
              "partner",
              applyPartnerSettingsFieldChange(
                settings,
                "requirementAge",
                value as number,
                {
                  alignAlphaLeaveAgeToRetirement: false,
                  dateOfBirthUpdate: "relink-npa-defaults",
                }
              )
            )
          }
          showGuidanceNotes={showGuidanceNotes}
          useNpaLinkedDefaults
          domIdPrefix="partner-household-retirement"
        />
        <HouseholdRangeField
          field={{
            ...FULL_SALARY_FIELD,
            label: "Your gross annual employment income before retirement",
            description:
              "Used only after Partner retires first and until you retire. It is included in Your estimated Income Tax; this is not a payroll take-home forecast because National Insurance is not modelled.",
          }}
          value={settings.fullSalary}
          settings={settings}
          onChange={(fullSalary) => onChange("fullSalary", fullSalary)}
          showGuidanceNotes={showGuidanceNotes}
          domIdPrefix="you-household-salary"
        />
        <HouseholdRangeField
          field={{
            ...FULL_SALARY_FIELD,
            label: "Partner gross annual employment income before retirement",
            description: "",
          }}
          value={partner.fullSalary}
          settings={partner as PensionSettings}
          onChange={(fullSalary) =>
            onChange("partner", { ...partner, fullSalary })
          }
          showGuidanceNotes={showGuidanceNotes}
          domIdPrefix="partner-household-salary"
        />
        {hasTransitionPeriod ? (
          <HouseholdCurrencyField
            field={{
              ...RETIREMENT_TARGET_FIELD,
              label: transitionLabel,
              description:
                "Annual household spending target after estimated Income Tax while one person is retired and the other is still working. The quick-select amounts are Pensions UK's two-person Retirement Living Standards expenditure references; adjust them for your circumstances, including housing costs.",
              presets:
                TWO_PERSON_RETIREMENT_LIVING_STANDARDS.annualExpenditure.map(
                  (preset) => ({ ...preset })
                ),
            }}
            value={settings.jointRetirement.transitionDesiredRetirementIncome}
            onChange={(transitionDesiredRetirementIncome) =>
              updateJoint({ transitionDesiredRetirementIncome })
            }
            showGuidanceNotes={showGuidanceNotes}
            domIdPrefix="household-transition-target"
          />
        ) : null}
        <HouseholdCurrencyField
          field={{
            ...RETIREMENT_TARGET_FIELD,
            label: "Household target once you are both retired",
            description:
              "Annual household spending target after estimated Income Tax from the later retirement date onward. The quick-select amounts are Pensions UK's two-person Retirement Living Standards expenditure references; adjust them for your circumstances, including housing costs.",
            presets:
              TWO_PERSON_RETIREMENT_LIVING_STANDARDS.annualExpenditure.map(
                (preset) => ({ ...preset })
              ),
          }}
          value={settings.jointRetirement.fullyRetiredDesiredRetirementIncome}
          onChange={(fullyRetiredDesiredRetirementIncome) =>
            updateJoint({ fullyRetiredDesiredRetirementIncome })
          }
          showGuidanceNotes={showGuidanceNotes}
          domIdPrefix="household-fully-retired-target"
        />
      </div>
      {showSpendingSmileEditor ? (
        <JointHouseholdSpendingSmileEditor
          settings={settings}
          partner={partner}
          validationIssues={validationIssues}
          onChange={onChange}
        />
      ) : null}
      <JointFundingPriority settings={settings} onChange={onChange} />
    </section>
  );
}

function JointHouseholdSpendingSmileEditor({
  settings,
  partner,
  validationIssues,
  onChange,
}: {
  settings: PensionSettings;
  partner: PartnerSettings;
  validationIssues: PensionValidationIssue[];
  onChange: SettingsFieldOnChange;
}) {
  const reference = getLaterRetirementReference(settings, partner);
  const householdSettings: PensionSettings = {
    ...settings,
    desiredRetirementIncome:
      settings.jointRetirement.fullyRetiredDesiredRetirementIncome,
    requirementAge: reference.settings.requirementAge,
    lifeExpectancy: reference.settings.lifeExpectancy,
    spendingStrategyType: settings.jointRetirement.spendingStrategyType,
    spendingSmile: settings.jointRetirement.spendingSmile,
  };
  return (
    <section
      className="settings-section"
      aria-labelledby="household-spending-strategy-heading"
    >
      <div className="section-heading">
        <h4 id="household-spending-strategy-heading">
          Household spending strategy once you are both retired
        </h4>
        <p className="section-copy">
          This applies only from the later retirement date. The transition
          household target remains flat while one person is still working.
        </p>
      </div>
      <SpendingSmileEditor
        settings={householdSettings}
        validationIssues={validationIssues}
        onChange={(key, value) => {
          if (key === "spendingStrategyType") {
            onChange("jointRetirement", {
              ...settings.jointRetirement,
              spendingStrategyType:
                value as PensionSettings["spendingStrategyType"],
            });
          }
          if (key === "spendingSmile") {
            onChange("jointRetirement", {
              ...settings.jointRetirement,
              spendingSmile: value as SpendingSmileStrategy,
            });
          }
        }}
        retirementReferenceLabel={reference.label}
        targetLabel="the household target once you are both retired"
        validationField="jointRetirement"
        domIdPrefix="household-spending"
      />
    </section>
  );
}

function JointFundingPriority({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
}) {
  const partner = settings.partner;
  if (!partner) {
    return null;
  }
  const priorityAccounts =
    getHouseholdFlexibleWithdrawalPriorityAccounts(settings);
  const nonPriorityAccounts =
    getHouseholdFlexibleWithdrawalNonPriorityAccounts(settings);

  if (!shouldShowHouseholdFlexibleWithdrawalPriority(settings)) {
    return null;
  }

  return (
    <FundingPriorityEditor
      idPrefix="joint-funding"
      priorityAccounts={priorityAccounts}
      nonPriorityAccounts={nonPriorityAccounts}
      getAccountLabel={getHouseholdFlexibleFundAccountLabel}
      getStrategy={(accountId) =>
        getHouseholdWithdrawalStrategy(settings, accountId)
      }
      onStrategyChange={(accountId, strategy) => {
        const [owner, flexibleAccountId] =
          splitHouseholdFlexibleFundAccountId(accountId);
        const strategyFieldId = getWithdrawalStrategyFieldId(flexibleAccountId);
        if (owner === "you") {
          onChange(strategyFieldId, strategy);
          return;
        }
        onChange("partner", { ...partner, [strategyFieldId]: strategy });
      }}
      onPriorityOrderChange={(reorderedAccounts) =>
        onChange("jointRetirement", {
          ...settings.jointRetirement,
          flexibleWithdrawalPriority: [
            ...reorderedAccounts,
            ...settings.jointRetirement.flexibleWithdrawalPriority.filter(
              (account) => !reorderedAccounts.includes(account)
            ),
          ],
        })
      }
      helpText={
        <>
          Accounts owned by either person that use “Use to meet income target”
          are coordinated in this order. Other strategies keep their own
          instructions. Taxable withdrawals use the owner&apos;s tax position
          and pension lump-sum allowance.
        </>
      }
      emptyMessage="Include a SIPP, Civil Service AVC, LISA or ISA for either person to set its withdrawal strategy and household funding priority here."
    />
  );
}

export function JointPartnerTaxFields({
  settings,
  onChange,
  showGuidanceNotes,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  showGuidanceNotes: boolean;
}) {
  if (!settings.jointRetirement.enabled || !settings.partner) {
    return null;
  }
  const partner = settings.partner;

  return (
    <section
      className="settings-section"
      aria-labelledby="partner-lump-sum-allowance-heading"
    >
      <div className="section-heading">
        <h3 id="partner-lump-sum-allowance-heading">
          Partner pension lump-sum allowance
        </h3>
        <p className="section-copy">
          Partner has a separate pension lump-sum allowance ledger. It is never
          used for Your pension withdrawals or automatic lump sums.
        </p>
      </div>
      <CheckboxFieldGrid
        items={[
          {
            id: "partner-tax-track-lump-sum-allowance",
            label: "Track Partner pension lump-sum allowance",
            description:
              "Keep Partner's pension lump-sum allowance separate from Yours.",
            checked: partner.taxTrackLumpSumAllowance,
            onChange: (taxTrackLumpSumAllowance) =>
              onChange("partner", {
                ...partner,
                taxTrackLumpSumAllowance,
              }),
          },
        ]}
      />
      <div className="field-grid">
        <HouseholdCurrencyField
          field={{
            ...LUMP_SUM_ALLOWANCE_FIELD,
            label: "Partner pension lump-sum allowance",
          }}
          value={partner.taxLumpSumAllowance}
          onChange={(taxLumpSumAllowance) =>
            onChange("partner", { ...partner, taxLumpSumAllowance })
          }
          showGuidanceNotes={showGuidanceNotes}
          domIdPrefix="partner-tax-lump-sum-allowance"
        />
        <HouseholdCurrencyField
          field={{
            ...LUMP_SUM_ALLOWANCE_USED_FIELD,
            label: "Partner pension lump-sum allowance already used",
          }}
          value={partner.taxLumpSumAllowanceUsed}
          onChange={(taxLumpSumAllowanceUsed) =>
            onChange("partner", { ...partner, taxLumpSumAllowanceUsed })
          }
          showGuidanceNotes={showGuidanceNotes}
          domIdPrefix="partner-tax-lump-sum-allowance-used"
        />
      </div>
    </section>
  );
}

function HouseholdCurrencyField({
  field,
  value,
  onChange,
  showGuidanceNotes,
  resetValue,
  domIdPrefix,
}: {
  field: CurrencyInputField;
  value: number;
  onChange: (value: number) => void;
  showGuidanceNotes: boolean;
  resetValue?: number;
  domIdPrefix?: string;
}) {
  return (
    <CurrencySettingField
      field={field}
      value={value}
      onChange={(_, nextValue) => onChange(nextValue as number)}
      showGuidanceNotes={showGuidanceNotes}
      resetValue={resetValue}
      domIdPrefix={domIdPrefix}
    />
  );
}

function HouseholdRangeField({
  field,
  value,
  settings,
  onChange,
  showGuidanceNotes,
  resetValue,
  domIdPrefix,
}: {
  field: RangeField;
  value: number;
  settings: PensionSettings;
  onChange: (value: number) => void;
  showGuidanceNotes: boolean;
  resetValue?: number;
  domIdPrefix?: string;
}) {
  return (
    <RangeSettingField
      field={field}
      value={value}
      settings={settings}
      onChange={(_, nextValue) => onChange(nextValue as number)}
      showGuidanceNotes={showGuidanceNotes}
      resetValue={resetValue}
      domIdPrefix={domIdPrefix}
    />
  );
}

function getRetirementMonths(
  settings: Pick<PensionSettings, "dateOfBirth" | "requirementAge">,
  partner: Pick<PensionSettings, "dateOfBirth" | "requirementAge">
) {
  return {
    you: toCalendarMonth(
      addYears(settings.dateOfBirth, settings.requirementAge)
    ),
    partner: toCalendarMonth(
      addYears(partner.dateOfBirth, partner.requirementAge)
    ),
  };
}

function toCalendarMonth(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(0, 7)}-01` : date;
}

function getLaterRetirementReference(
  settings: Pick<
    PensionSettings,
    "dateOfBirth" | "requirementAge" | "lifeExpectancy"
  >,
  partner: Pick<
    PensionSettings,
    "dateOfBirth" | "requirementAge" | "lifeExpectancy"
  >
) {
  const retirementMonths = getRetirementMonths(settings, partner);

  return retirementMonths.partner >= retirementMonths.you
    ? { settings: partner, label: "Partner's" }
    : { settings, label: "your" };
}

function getSharedRangeField(id: RangeField["id"]): RangeField {
  const field = fieldGroups
    .flatMap((group) => group.fields)
    .find((candidate) => candidate.id === id);

  if (!field || field.type !== "range") {
    throw new Error(`Expected a shared range field for ${id}.`);
  }

  return field;
}

function getSharedCurrencyField(
  id: CurrencyInputField["id"]
): CurrencyInputField {
  const field = fieldGroups
    .flatMap((group) => group.fields)
    .find((candidate) => candidate.id === id);

  if (!field || field.type !== "currency-input") {
    throw new Error(`Expected a shared currency field for ${id}.`);
  }

  return field;
}
