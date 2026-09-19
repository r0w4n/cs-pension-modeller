# Retire Early: goal-seeking implementation specification

Investigation date: 19 September 2026. Repository HEAD: `be88d9c`, including the existing uncommitted working tree. This is an analysis and proposed specification, not an implementation or an approval of the open product decisions in section 9.

The smallest coherent solution is a deterministic, bounded scenario search around the existing retirement calculator. Keep the `bridge` journey identity, shared form controls, pension calculations, result projections and graph. Replace manual withdrawal planning with calculated scenarios, preserve the user's current contributions as the baseline, and report both additional funding and possible contribution reductions.

There are two prerequisites that prevent this being just a journey configuration change: contribution amounts have different cost bases, and changing today's Added Pension contribution currently changes historical pension accrual. Neither can be ignored when claiming to find a minimum contribution.

## 1. Current implementation

### 1.1 Entry point and complete journey

`src/App.tsx` composes `useAppController` and the journey screen. `src/app/mode-selection.tsx` selects mode `bridge`; `src/app/use-app-mode-state.ts` maps that mode to `JOURNEY_DEFINITIONS[0]` in `src/app-domains/journeys.ts`. Its ID is `early-retirement-bridge`, and its public title is **Work out what I need to retire early**. There is no separate pension calculation engine for this journey.

`src/app/journey.tsx`, `journey-mode-screen.tsx` and `journey-step-content.tsx` render the shared step definitions, filter conditional steps, navigate, display validation, and trigger calculation when Results becomes active.

The current steps, in order, are:

| Step ID                    | Current content                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personal`                 | Birth month/year and `lifeExpectancy` planning horizon.                                                                                                     |
| `target`                   | Monthly presentation of annual `desiredRetirementIncome`, after estimated tax, and `taxRegime`.                                                             |
| `retirement-age`           | `requirementAge`, the retirement/spending start age.                                                                                                        |
| `include`                  | Alpha, classic, classic plus, nuvos and Premium selection.                                                                                                  |
| `alpha`                    | Draw age, ABS year, accrued pension, earnings, monthly Added Pension, EPA toggle. Its `groupId` also renders Added Pension lump-sum and EPA-period editors. |
| `classic` / `classic-plus` | Draw ages, manual benefits or salary/service estimates, final salary links, automatic lump sums and increases.                                              |
| `nuvos`                    | Draw age, statement year, accrued pension and increase assumptions.                                                                                         |
| `premium`                  | Preserved benefit, valuation date, draw age, NPA and access information.                                                                                    |
| `state`                    | Forecast amount/confirmation, draw date and uprating assumptions.                                                                                           |
| `pots`                     | ISA, LISA, SIPP, CS AVC and other guaranteed-income selection.                                                                                              |
| `bridge-strategy`          | Spending Smile editor and `FlexibleWithdrawalPriorityEditor`; the latter includes strategy choices as well as funding order.                                |
| `additional-income`        | Shared editor for known external guaranteed-income streams.                                                                                                 |
| `isa` / `lisa`             | Current balance, monthly contribution, draw age, growth, withdrawal percentage and use-by age.                                                              |
| `sipp`                     | The same, plus protected-access confirmation and contribution tax-relief rate.                                                                              |
| `cs-avc`                   | Balance, contribution, draw age, protected-access confirmation, growth, withdrawal percentage and use-by age.                                               |
| `pot-tax`                  | SIPP/AVC withdrawal tax treatment, tax-free shares and shared lump-sum allowance.                                                                           |
| `check-plan`               | `buildBridgePlanReview` summarises settings and withdrawal instructions.                                                                                    |
| `answer`                   | Standard summary/chart, expanded inflation disclosure, comparisons and projection table.                                                                    |

Conditional pension/pot steps appear only when enabled. Alpha and LISA currently have supplementary-editor `groupId`s in this journey; ISA/SIPP/AVC do not, despite their shared settings supporting lump-sum schedules. Imported schedules can therefore affect calculations without those bridge steps exposing their editors. Fix this visibility gap in the proposed input review, rather than deleting schedules.

`applyBridgeJourneyDefaults` enables State Pension, SIPP, ISA and LISA, preserves CS AVC visibility, selects `use_by_age` for all four pots, enables after-tax assessment and disables partial retirement. These are defaults, not a live optimisation policy. Existing tests explicitly assert that default bridge projections do not use target-based withdrawal strategies.

### 1.2 State, updates, validation and persistence

- `PensionSettings` in `src/settings/settings-types.ts` is the common calculation contract. It includes individual scheme benefits, all four flexible pots, Alpha Added Pension purchases, target, timing, tax, inflation and optional joint settings.
- `useJourneySettings` owns `PensionSettingsByJourney`, with separate `simple`, `bridge` and `expert` settings. It handles imports, exports, reset and automatic local saving. The active settings are selected by mode.
- `src/app/chart-state.ts` owns shared field/chart updates, including `applySettingsFieldChange` and `applyRetirementIncomeChartParameterPatch`. A changed retirement age can move an aligned Alpha draw age and reduce the Alpha leave age. Bridge has `alignAlphaLeaveAgeToRetirement: false`: moving retirement later does not necessarily restore a previously earlier leave age. The retirement-step copy is consequently stronger than the update behaviour guarantees.
- `normalizeSetting`/`normalizeSettings`, the settings-domain modules and `validateSettings` own normalization and validation. Numeric modelling ages use quarter years. Despite slider steps of £25 for several contributions, normalization preserves fractional amounts for rules whose step is not 1; the solver must not infer its search resolution from slider step size.
- Invalid settings cause `deriveProjectionInputs` to return `null`, producing no projection rows. Empty rows must never be treated as financial infeasibility or success.
- Storage uses versioned JSON under `cs-pension-modeller.settings`. The actual current schema is **18** in `settings-versions.ts`; README's discussion of version 16 is historical migration context. `startDate` and `normalPensionAge` are runtime-derived rather than stored settings.
- Saved comparisons contain full settings snapshots. Parameter JSON supports separate journeys and legacy flat files. No financial-settings query-string mechanism was found; the URL query usage found concerns the support prompt.
- Clear-all resets retained application state and caches as well as storage. The new solver must participate in that lifecycle, including cancellation of in-flight results.

### 1.3 Runtime calculation and results flow

```text
Shared fields / journey actions
  -> useJourneySettings + chart-state updates
  -> useAppController
  -> useProjectionCalculations (Results only)
  -> retirement-plan-calculation-worker / shell cache
  -> calculateRetirementPlan(settings, options)
     -> validateSettings
     -> createProjectionTableResult
        -> deriveProjectionInputs + runtime dates
        -> row-engine-with-pension-increases or row-engine-base
        -> row-assembly + projection-domains
        -> coordinateFlexibleWithdrawals
        -> applyTaxYearIncomeTax / effective-rate iteration
     -> assessRetirementPlan + summary + sensitivities/previews
  -> result-projection/retirement-results
  -> JourneyResultsStep / summary / graph / comparison / table
```

`calculateRetirementPlan` in `src/calculation/retirement-plan.ts` is the canonical active-plan entry. `RetirementPlanResult` contains the exact settings used, rows, summary, assessment, convergence diagnostics, inflation assumptions, State Pension sensitivity and withdrawal previews. Optional joint results belong to Expert.

The current uncommitted worker work performs a fast calculation without withdrawal previews and later enriches the result. `useProjectionCalculations` retains the last result while recalculating, discards stale results, and uses an invalidation token. `retirement-plan-result-cache.ts` currently caps its cache at 12 and distinguishes fast/full preview calculations. Extending calculation options requires extending cache identity; its existing key does not generically encode every option.

`assessRetirementPlan` consumes the calculation-owned `createRetirementIncomeAssessmentSeries`. It assesses retirement through the horizon, with first/largest shortfalls, shortfall months, cumulative shortfall, secure-income surplus and flexible-fund exhaustion. `money.ts` defines £0.005 numerical tolerance and a **£1 cumulative lifetime shortfall** reporting threshold. An income excess later does not offset an earlier shortfall.

The assessment series has existing first/last withdrawal-month adjustments. The new solver must use this canonical assessment, not invent a different monthly success measure. Boundary regression fixtures must also inspect raw rows; if they expose an assessment/cash-flow discrepancy, report and resolve it explicitly before relying on that case.

### 1.4 Supported mechanisms and constraints

| Mechanism                    | Production implementation and relevant meaning                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ISA                          | `projection-domains/isa.ts` delegates to `flexible-fund-forward-projection.ts`. Current balance, monthly saving, dated one-off/yearly additions, growth and four withdrawal strategies. No contribution gross-up. Contributions stop at the earlier of retirement and draw date. No combined ISA/LISA subscription allowance enforcement was found.                                                                                                           |
| SIPP                         | `projection-domains/sipp.ts` uses the same forward projection. Monthly/lump-sum input is net cost; relief multiplies it by 1, 1/0.8 or 1/0.6. The 40% option represents ultimate net cost with relief effectively reinvested. Withdrawal taxation is separate from contribution relief. Contributions stop at the earlier of retirement and draw.                                                                                                             |
| CS AVC                       | `projection-domains/cs-avc.ts` is a separate invested DC pot. Entered contribution is money added to the pot; there is no SIPP-style gross-up or employer contribution. Existing inclusion of contribution-stop-date payments differs from SIPP/ISA; preserve/test it.                                                                                                                                                                                        |
| LISA                         | `projection-domains/lisa.ts` caps eligible additions at £4,000 per tax year and adds 25%; contributions stop at the earliest of draw, retirement and age 50. Retirement withdrawal access is 60. It does not model opening eligibility, early-withdrawal charges, first-home use or external subscriptions.                                                                                                                                                   |
| Alpha                        | `projection-domains/alpha.ts`, `derive-inputs.ts` and the row engine calculate statement roll-forward, earnings accrual, CPI, EPA portions, early-payment factors and supported late-retirement factors. Accrual stops at the earlier of leave and draw. Existing entitlement is fixed; salary, accrual rate and ordinary scheme contributions are not solver controls.                                                                                       |
| Alpha Added Pension          | `alphaAddedPensionMonthly`, factor type and dated lump-sum purchases use the bundled 2026-01 GAD tables. Purchased benefits join Alpha income; there is no independently accessible pot. Regular purchases stop at service/draw/support boundaries; first unsupported purchase age is 68, with an existing month-only birth-date convention. There is no separate accrued Added Pension balance field or complete purchase-limit/remaining-entitlement model. |
| classic / classic plus       | `projection-domains/classic.ts`: manual benefit or final salary/service calculation, automatic lump sum, NPA 60 and simplified 5%/year early reduction pro-rated by month. These are preserved/legacy benefit calculations, not contribution investment vehicles.                                                                                                                                                                                             |
| nuvos                        | `projection-domains/nuvos.ts`: legacy accrual ends 31 March 2015, NPA 65, separate CPI and early-reduction banding of 5%, 4%, then 3% per year. Do not substitute Alpha factors.                                                                                                                                                                                                                                                                              |
| Premium                      | `projection-domains/premium.ts`: preserved benefit, no new accrual, CPI revaluation, published reduction tables for supported NPA 60/65 cases from age 55. A selected earliest access age of 50 does not supply missing under-55 factor support. `factorUnavailable` must exclude an automatic candidate.                                                                                                                                                     |
| State Pension / other income | Forecast and confirmation, birth-date-derived entitlement, optional deferral/uprating; other income uses supplied amounts/dates/indexation/taxability. Neither is new contribution capital for this search.                                                                                                                                                                                                                                                   |

The encoded SIPP/AVC access rule depends on the **candidate draw date**: normally 55 before 6 April 2028 and 57 thereafter. The protected-access resolvers currently return **50** when the confirmation boolean is true, rather than the stored numeric protected-age field. Preserve and disclose the actual supported model; do not treat the numeric field as arbitrary provider-specific access support. Alpha has its own date-sensitive normalization/validation. Legacy DB minima and factor coverage differ; generic pension-age logic must not replace them.

Growth fields are named `*RealInterestPercent`, but the production inflation functions treat those inputs as nominal return assumptions and derive real returns using `(1 + nominal)/(1 + inflation) - 1`. Reuse those functions and the actual field descriptions. Do not implement growth from field names or introduce new solver assumptions.

`fullSalary` is also distinct from `pensionableEarnings`: it supplies pre-retirement tax-year context even though full employment income is not plotted as retirement income. The current bridge does not ask for it. Expose or explicitly confirm this existing assumption, particularly for retirement partway through a tax year; do not infer that pensionable earnings and total taxable salary must be equal.

classic/classic-plus automatic lump sums affect summary/allowance accounting. They are not automatically reinvested into an ISA bridge pot. Surplus pension income is not a newly available invested account either. Making either fund future shortfalls would be a separate financial-model extension.

### 1.5 Existing sequencing and search functionality

`coordinateFlexibleWithdrawals` already does the central drawdown work:

1. Take secure income and any explicitly configured withdrawals into account.
2. From retirement, identify the remaining target gap.
3. Process `meet_income_target` accounts in `flexibleWithdrawalPriority` order, skipping inaccessible or empty accounts.
4. Withdraw no more than available balances. For taxable withdrawals, solve the gross withdrawal needed to supply the net gap.
5. Preserve remaining balances and compound subsequent growth.

Default account order is **SIPP, CS AVC, LISA, ISA**, not ISA first. Accessibility can nevertheless cause ISA to fund the early years. This is an input order, not an existing optimality claim.

There is a private 50-iteration binary search for sufficient withdrawals in `flexible-withdrawals.ts`. `projection-core.ts` iterates tax-year effective rates, default maximum 12 iterations, and exposes whether it converged. Joint calculation has separate household coordination, outside this feature's scope.

`calculation/added-pension-goal.ts` estimates the income sensitivity of a £100 monthly purchase using two full projections and a summary point, then linearly estimates a contribution. Its editor still exists in `journey-step-content.tsx`, but the current bridge definition does not enable `addedPensionIncomeGoal`, and the simple journey excludes Added Pension. This helper is not a lifetime bridge solver, is not exact through tax bands, and should not become the optimisation engine.

`target-based-withdrawal-previews.ts` demonstrates non-destructive alternate projections, but measures reduced withdrawals/unallocated surplus, not reduced contributions. Existing surplus insights expressly do not establish that contributions can safely be reduced.

### 1.6 Confirmed Added Pension temporal issue

`row-engine-with-pension-increases.ts` builds historical rows from the ABS. `calculateAddedPensionValues` in `row-assembly.ts` applies `alphaAddedPensionMonthly` to those rows too, except the initial statement-only row. Thus varying the field changes benefits modelled before `startDate`.

A read-only production calculation used birth date 1980-01-01, start 2026-09-01, ABS 2025, annual accrued Alpha £10,000, earnings £40,000, retirement/leave 60 and draw 68. Changing monthly Added Pension from £0 to £100 created **£128.8410745 of annual Added Pension in historical rows before the calculation start**, as well as the current-period purchase. Validation returned no issues.

This is not a request to rewrite historical treatment for existing plans. It proves that the existing scalar cannot represent a new prospective solver increase. A dated future contribution change is required before automatically varying Added Pension. Existing historic accrual and purchased benefits must stay fixed under both increases and reductions.

## 2. Gap analysis

| Requirement                 | Current behaviour                                                                                                                 | Required change / affected ownership                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Evolve existing journey  | Existing `bridge` identity and shared steps.                                                                                      | Retain identity, mode, storage namespace and result composition; change configuration/copy.                                                                                                                       |
| 2. Simplify inputs          | User supplies pension/pot draw ages, strategies, percentages and use-by dates. Some saved assumptions are not editable in bridge. | Remove automatic timing/sequence questions from guided mode; retain personal facts, benefits, contributions and tax/access evidence. Materialise valid reference settings; expose retained schedules/assumptions. |
| 3. Goal seeking             | Assesses configured projection only.                                                                                              | Add calculation-owned bounded scenario search and explicit current/required-contribution results.                                                                                                                 |
| 4. Access/sequence          | Coordinated target withdrawals already exist; timing/order supplied by user.                                                      | Derive flexible access eligibility; search supported DB draw ages and bounded account orders. Reuse withdrawal coordinator.                                                                                       |
| 5. Additional contributions | No mixed-asset funding solver; contribution bases differ.                                                                         | Define objective explicitly; search mixtures, protect historical Added Pension, enforce supported bounds and report eligibility limitations.                                                                      |
| 6. Surplus                  | Withdrawal surplus, secure surplus and residual pots are reported.                                                                | Separately search downward in ongoing contributions. Do not equate unspent withdrawals or final pot balances with reducible monthly saving.                                                                       |
| 7. Preserve results/graph   | Canonical rows feed shared graph.                                                                                                 | Select a complete canonical scenario before projecting all result props. No graph implementation change is needed.                                                                                                |
| 8. Messaging                | Existing statuses and shortfall summaries; no optimisation explanation.                                                           | One concise goal summary plus scenario selector and expandable assumptions/contribution table.                                                                                                                    |
| 9. Reuse calculations       | Strong functional-core separation; existing preview patterns.                                                                     | Optimiser varies `PensionSettings`, calls canonical calculation, and consumes canonical assessments/diagnostics. No shadow tax, pension or bridge engine.                                                         |
| 10. Compatibility           | Shared contracts, per-journey saves, comparisons, worker/cache.                                                                   | Disabled-by-default generic goal policy, bridge activation through shell, versioned migration and saved forward-scenario compatibility. Regression-test simple and Expert, including households.                  |

## 3. Proposed user journey

The following is the recommended design, subject to the decisions in section 9.

1. **Your personal details:** keep birth month/year and planning horizon. Runtime start remains automatic. State that the horizon is an assumption, not a lifespan prediction.
2. **Your spending target:** retain the existing monthly after-tax field, annual equivalent, tax regime and standards guidance. Retain optional Spending Smile in a disclosure here, using its existing component. New plans use flat spending; existing phase settings remain visible and preserved.
3. **Your retirement age:** retain `requirementAge`. Do not silently solve for a later retirement or lower target. Those can be user edits after an unsuccessful result.
4. **Your Civil Service pensions:** retain selection and existing scheme-specific benefit fields. Remove prospective Alpha/classic/classic-plus/nuvos/Premium draw-age questions. Keep Premium NPA/access facts, statement dates, benefit amounts and salary/service details. Keep existing EPA periods as facts/assumptions, not solver decision variables.
5. **Future Civil Service service and Added Pension:** retain earnings, existing purchases and purchase type. Expose existing `alphaPensionLeaveAge` in an optional employment-assumptions disclosure, initially linked to retirement, so people leaving Civil Service before retiring are representable. Display rather than conceal that assumption. Keep a clear distinction between benefits already included in the statement, known historical purchases after it, and ongoing/future payments. Do not introduce a second accrued amount without deciding statement inclusion rules.
6. **State Pension:** retain forecast, confirmation and uprating. Derive the ordinary prospective start from the existing entitlement-date function. Existing deferral or pension already in payment needs an explicit retained/fixed assumption; do not undo it as if it were a future decision. Other guaranteed-income dates remain user-entered because the model cannot infer them.
7. **Your retirement savings:** retain ISA/LISA/SIPP/CS AVC selection, balances, ongoing contributions, growth and SIPP relief basis. Retain confirmed protection facts. Expose saved lump-sum schedules using the existing supplementary editors; do not optimise their amounts or invent extra capital.
8. **Tax and modelling assumptions:** retain pot withdrawal treatment, allowance-used information and other material inputs. Add a concise disclosure for inflation/projection basis and any imported hidden assumptions. Use existing fields, not bespoke controls. Explain contribution bases next to each value.
9. **Check your inputs:** update `buildBridgePlanReview` to show target, horizon, assets, current contribution vector, fixed schedules and automatically modelled timing. Replace manual strategy instructions with the search policy and its limits. If needed, offer a small set of eligibility/permission questions for which existing accounts can accept additional payments; see section 9.
10. **Results:** calculate current-contribution feasibility and a required-contribution scenario, then show the existing graph with the selected scenario's complete settings/result. Preserve comparison and table.

Remove the `bridge-strategy` step as a manual asset-sequencing step. Remove guided controls for `isaDrawAge`, `sippDrawAge`, `csAvcDrawAge`, `lisaDrawAge`, all four withdrawal percentages/use-by ages/strategies, and prospective DB draw ages. Remove manual priority editing in automatic goal mode. Do not remove these shared fields or Expert controls from the application.

Automatically supplied values are target-based strategies, admissible flexible draw ages, selected DB draw ages, funding priority and candidate ongoing contributions. User-entered baseline contributions must never be overwritten by displaying a candidate. Optional manual forward modelling remains available in Expert; legacy bridge compatibility needs an explicit transition as described below.

## 4. Proposed optimisation model

### 4.1 Contract and scope

Implement a generic deterministic retirement-goal calculation, not a `journeyId` branch inside pension rules. The application enables the goal policy for bridge; the calculator responds only to that explicit policy. Keep ordinary `calculateRetirementPlan(settings)` behaviour unchanged when it is disabled.

Inputs are the canonical baseline settings, explicit runtime `startDate`, goal policy version, allowed contribution mechanisms, supported search bounds and optional pinned facts. Hold fixed balances, accrued entitlements, salary/accrual assumptions, growth/inflation, target/horizon, State Pension forecast, lump-sum schedules, tax settings and benefit type. No stochastic forecasts, asset transfers, new borrowing, salary optimisation or household optimisation.

Outputs distinguish:

- ordinary configured/reference projection;
- best current-contribution route found, including modelled timing;
- feasible additional-contribution route, or lower-contribution route when current funding works;
- search status/limits, exclusions, unresolved eligibility and numerical diagnostics.

The first two are different questions: a legacy plan can fail under its manual drawdown settings and work under automatic target withdrawals without increasing contributions. Explain that distinction rather than calling the original manual plan already sufficient.

### 4.2 Decision variables and constraints

Variables:

- Future monthly ISA, SIPP, LISA, CS AVC and prospective Alpha Added Pension contributions, only where enabled, eligible and permitted.
- Quarter-year prospective DB draw ages within each scheme's supported range.
- One fixed priority permutation of enabled flexible accounts; maximum 24 permutations.

Flexible access is an **eligibility bound**, not a requirement to withdraw on that date. For each account choose the earliest valid quarter-year age at or after retirement and strictly after the current date that satisfies its existing validation/access rules. Evaluate SIPP/AVC rules using the candidate date, especially around April 2028. Use LISA 60 and existing protection semantics. Target drawdown then decides whether any money is actually used at that age. Report both eligibility and first actual withdrawal if they differ.

Do not binary-search DB ages: actuarial reductions, taxation and bridge duration make the outcome non-monotone. Candidate ages should cover all supported quarter years from the later of retirement/current prospective boundary/scheme minimum through the earlier of the scheme's existing UI/model upper bound and horizon. Include NPA, EPA-relevant ages and existing valid fixed ages. Preserve already-started benefits as fixed; they are not prospective timing decisions. Exclude unsupported factors explicitly, including Premium under 55. Do not move Alpha leave age with its draw age to manufacture additional service.

Keep State Pension at entitlement for a new plan unless the user has a fixed deferral/in-payment fact. Do not optimise deferral in the first release. Keep additional guaranteed income dates fixed. There is no asset-specific use-by age under `meet_income_target`; keep stored values for compatibility, but they do not constrain automatic withdrawals.

Current model-input contribution maxima are SIPP £3,000/month, ISA £3,000/month, CS AVC £5,000/month, LISA £4,000/12 per month, Added Pension £2,000/month. These are software bounds, **not entitlement, tax-relief or affordability limits**. Read them from their owners rather than copying them into a second constants table. Preserve fixed lump sums when checking headroom. Reject non-finite values and negative balances/contributions at the solver boundary; don't silently clamp an invalid candidate into apparent success.

Opening a new LISA, adding an unsupported pension product, changing survivor-benefit type, making new EPA purchases, changing ordinary DB accrual and reinvesting automatic lump sums are outside the first implementation. An enabled zero-balance pot is not by itself proof of account eligibility.

### 4.3 Feasibility predicate

Evaluate every candidate through `calculateRetirementPlan` with goal recursion disabled and withdrawal previews disabled. A candidate is model-feasible only when:

1. Its canonical settings validate, have finite outputs and non-empty coverage for the required retirement-to-horizon period.
2. No required factor is unavailable.
3. `diagnostics.targetWithdrawalConvergence.converged` is true.
4. `assessment.meetsTargetThroughout` is true using the existing lifetime tolerance.
5. Any approved solver-specific eligibility/cap constraints hold.

Keep `invalid`, `unsupported`, `unsettled calculation`, `financial shortfall`, `feasible` and `search limit reached` distinct. An unconfirmed State Pension can yield mathematical feasibility but must retain **Needs checking** where the target depends on it. Recalculate the existing sensitivity for the displayed selected scenario.

Do not subtract future income surpluses from earlier unmet spending, treat inaccessible pension wealth as current cash, or count final balances as annual income.

### 4.4 Objective: a necessary product decision

The code does not establish a cross-account optimisation objective. A sum of raw contribution fields is not a sum of take-home costs.

Recommended smallest-scope objective, if explicitly accepted: minimise the **sum of additional monthly model-input payments** while retaining current payments to every other mechanism. Show the per-account bases and call it an approximate modelled contribution, not the lowest take-home cost. For a true personal-cost objective, first add an agreed contribution-cost model for AVC and Added Pension, earnings/relief eligibility and relevant taxation. That is materially more work.

For underfunding, with baseline vector `c0` and candidate `c`:

```text
minimise J(c) = sum(c[i] - c0[i]), subject to c[i] >= c0[i]
and full-horizon model feasibility.
```

No automatic redistribution of existing payments between mechanisms. For overfunding, search `0 <= c[i] <= c0[i]` and minimise `sum(c[i])`, preserving fixed schedules and all past benefits. Report `sum(c0)-sum(c)` as the model-input reduction under the displayed timing, with the same mixed-basis caveat. If future eligibility already ends before today, that channel has no reducible future payment even if a legacy scalar remains positive.

Tie-breaking: lower objective; then fewer changed contribution mechanisms; then smaller departure from supported reference pension timing; then stable scheme/account/age order. Do not maximise terminal wealth as an unannounced competing objective. If a chosen cost model assigns weights, its unit conversion and policy version must be explicit.

### 4.5 Deterministic bounded search

Use a small dependency-free search with **approximate best-found**, rather than global optimum, semantics. A single binary search cannot solve five contribution amounts, several non-monotone pension ages and account order simultaneously.

Recommended implementation procedure:

1. Build a valid reference plan with current contributions, earliest admissible flexible access, target withdrawals and supported NPA DB timing (or a fixed in-payment age). Explicitly materialise these reference settings in application state for automatic mode; don't apply a hidden calculation overlay.
2. Search current contributions first. Seed with NPA DB timing and earliest admissible DB timing, plus retained manual timing where valid. For each seed, evaluate all enabled-account priority permutations. Sweep each prospective DB draw-age coordinate over its full quarter-year candidate set, retaining improvements. Repeat until no improvement or the sweep/evaluation limit. If not feasible, rank candidates by fewer missed months, then lower lifetime shortfall, then stable ties. Keep several best distinct timing seeds, not just the first feasible one.
3. For each retained timing seed, attempt contribution solutions. Underfunded search starts with current contributions as lower bounds. Evaluate each single-channel upper bound and a joint upper-bound vector; the latter permits ISA-before-access plus pension-after-access solutions that single-channel searches miss. Overfunded search starts with the verified feasible current vector and zero lower bounds.
4. From each feasible vector, reduce one coordinate at a time while fixing the rest. Bracket a feasible upper and infeasible lower value and binary-search to a £1/month bracket, never discarding the known feasible vector. Refine to pennies only for the final displayed feasible amount if needed; LISA's last legal cent must remain within its existing cap. Use a fixed maximum of 32 bisections per coordinate. Test the adjacent lower representable value and re-evaluate rounded-up displayed contributions. Slider steps do not define the solver lattice.
5. Repeat reductions with a fixed list of coordinate orders: existing account order, reverse order, ISA-first, pension-first and Added-Pension-first, deduplicated for active accounts. Retain the lowest verified objective. Add bounded pairwise exchanges: reduce one changed channel and increase another by an equal/smaller input cost, at successively smaller £100, £25 and £1 trial sizes within bounds, accepting only feasible objective/tie-break improvements. This avoids relying solely on greedy single-channel choices. Disabled/ineligible channels never participate.
6. Revisit timing and priority around the best contribution vector, then rerun contribution reduction for improvements. Limit to two outer refinement passes initially. Deduplicate exact candidate settings throughout the request.
7. Validate the best final candidate with the normal full calculation, including ordinary diagnostic/sensitivity behaviour and with goal recursion still disabled. Return that exact canonical result and its exact settings, not an estimate from interpolation.

Bisection is only a local technique for a fixed timing/order and one increasing contribution coordinate. The current implementation does not prove monotonic feasibility across all tax/cap cases. Add fixtures and sample brackets/midpoints for reversals; if one is observed, use bounded explicit sampling/subdivision and mark the search approximate. Never use bisection over an unproven multi-asset allocation function, or interpret an invalid/non-converged candidate as a valid lower bound. A cap vector that fails is not proof that every smaller/reallocated vector fails.

Suggested initial global budget: 4,000 unique candidate projections, with final-candidate verification reserved outside that budget. Make this a named versioned policy constant, establish measured performance before finalising it, and return budget usage/truncation. Partition it deterministically between current-contribution timing search and contribution search so timing cannot consume everything. Use evaluation counts for determinism, not wall-clock cut-offs inside the pure solver. A shell can cancel a worker on new input.

When no solution is found, say **No route found within the modelled limits**, with the remaining gap and exhausted/unsupported constraints. Only state a scenario is structurally impossible where a simple explicit proof exists, for example a positive pre-access spending gap with no accessible source and no permitted future contribution capable of creating one. Do not claim the heuristic proves global infeasibility or a global minimum. If a guaranteed minimum is a product requirement, stop and agree a finite exhaustive search domain or a different optimisation formulation.

Performance is an acceptance criterion: benchmark representative short and long horizons, tax regimes, five-channel cases and multiple DB pensions using `scripts/benchmark-calculations.ts`. Preserve the existing worker boundary. Avoid main-thread execution of thousands of projections on worker failure; provide a recoverable unavailable/retry state, or a separately bounded fallback, for the optimisation while retaining ordinary forward results.

### 4.6 Gap and surplus reporting

Report current-contribution status over the full horizon, first shortfall age, largest annual/monthly gap, cumulative uncovered spending, and required contribution vector. Label the cumulative figure as uncovered spending over the projection, not capital required today.

For a feasible baseline, calculate a separate lower-contribution scenario. Show current versus required payments, differences, stop dates, secure-income surplus and residual assets as distinct measures. Reducing future contributions must not reduce accrued rights/current pots or rewrite fixed lump sums. A zero required ongoing contribution can be a valid result.

Derive sequence explanations from actual canonical withdrawals/income starts, ideally reusing income age-range semantics. An eligible account may remain unused, or be used intermittently after tax/secure income changes; do not describe every source as one disjoint phase. State the searched priority, eligibility dates, actual first-use dates and DB pension start ages.

## 5. Data and model changes

### 5.1 Generic goal policy

Add a narrowly typed optional/disabled-by-default `retirementGoal` policy to `PensionSettings`. Proposed contents: enabled/manual mode, policy version and allowed future-contribution mechanisms. Add only eligibility/headroom fields approved in section 9. Do not encode UI journey names in the functional core.

Bridge creates/enables the policy through application actions. Simple and Expert defaults leave it disabled. Snapshot loading must not accidentally enable goal search in other journeys; saved forward scenarios should remain ordinary projections. An optional bridge manual compatibility mode may retain old settings until a user chooses automatic modelling.

Normalization must validate nested policy data explicitly; `normalizeSetting` currently handles a few nested types specially, and must not pass the new object to numeric normalization. Update defaults, storage coercion, migration and export tests. Allocate the next schema version from the then-current tree, not a hard-coded assumption that version 19 is still free.

### 5.2 Prospective Added Pension change

Add an optional dated future monthly contribution override, using named settings fields such as `alphaAddedPensionFutureMonthly: number | null` and `alphaAddedPensionFutureFromDate: string | null` (final naming may follow the existing style). Null means no override, preserving legacy behaviour. From the effective date onward, use the override in the existing purchase calculation; before it use the existing scalar. Use the existing shared currency/date field infrastructure to expose any user-editable value.

The solver sets the override from the explicitly supplied calculation start. It does not overwrite the historical `alphaAddedPensionMonthly`. A saved candidate keeps its effective date, so reloading later does not retroactively move a planned change. A fresh recomputation uses the user's actual current contribution history; distinguish it from a saved hypothetical scenario. Validate partial pairs, stop dates and support bounds; zero is a real prospective stop-payment instruction, not missing.

Route the resolved payment through `calculateAddedPensionValues` and the existing factor/revaluation functions. Update contribution displays/review where needed to distinguish historical and prospective amounts. Add regression coverage showing identical pre-effective-date rows for all candidate increases/reductions. Do not silently revise historical factor application, purchased-benefit rules or existing scheme formulae as part of this change.

Already accrued Added Pension still needs a documented input convention. Default recommendation is one statement total that includes benefits already represented, plus only separately identified post-statement purchases; do not double count. A separate accrued Added Pension field is a domain extension if statement totals cannot represent the supported cases accurately.

### 5.3 Calculation result contract

Extend `RetirementPlanResult` with optional goal analysis containing:

- policy version, baseline identity and search metadata;
- discriminated status (`feasible-current`, `additional-required`, `reduction-found`, `no-route-found`, `invalid`, `unsupported`, `calculation-unsettled`, `search-limited`), with feasibility and completion separate where necessary;
- current-contribution and selected proposed scenario results/settings;
- per-account current/required/delta payment, basis and payment end date;
- objective definition/value and precision, search evaluation count, excluded candidates/mechanisms and material assumptions;
- best remaining shortfall if no verified route is available.

Prefer a discriminated union so failure cannot contain a fake £0 required contribution. Store only a bounded number of final candidate results, not every searched row array. Sequence and formatting are downstream semantic projections, not React output from the calculator.

Add an `includeRetirementGoal` calculation option (default enabled only when the settings policy enables it). Candidate evaluation explicitly sets it false, preventing recursive optimisation. `calculateRetirementPlan` remains the public active-plan entry; call a pure `calculateRetirementGoal` helper from it. Supply a tightly typed candidate evaluator callback from the canonical entry if that avoids a circular import; it must always execute the production calculator. Result projections must never launch the search.

### 5.4 Baseline, selected scenario and persistence

Keep one canonical editable baseline per journey. Final candidate snapshots are deliberate immutable calculation outputs, not hidden replacement values. `result.settings` at the top level must continue matching its request so current worker/cache identity checks remain valid.

The shell owns `selectedGoalScenario` and chooses a complete candidate `RetirementPlanResult`. Derive chart series, controls, limits, summary, inflation basis, table and comparison from **that same selected result's settings**. Never pair candidate rows with baseline controls, or pass a candidate plan into the baseline cache key: `createComparisonResult` explicitly rejects mismatched settings.

Construct candidate snapshots with their generic goal policy disabled before evaluating them, while keeping search provenance in the enclosing goal analysis. This lets the exact candidate settings/result be saved and compared as a forward scenario without changing settings identity after calculation. The baseline request retains its enabled goal policy and its own independent identity.

Do not persist computed search results by default. Persist inputs/policy and recompute with a new runtime date. Comparisons save the exact displayed forward scenario with goal search disabled, including any dated Added Pension change. Loading that snapshot should show it as a manual fixed scenario, not silently optimise it again. Offer a clearly labelled action to use its inputs for a fresh automatic search. Preserve the original baseline unless the user explicitly chooses to replace it.

Clear selected candidates, worker requests, caches, retained baseline history and undo entries when clearing all data. Turning saving off removes persisted data but preserves only the intended current in-memory session; re-enabling saving must not resurrect an earlier cleared solver result. Exporting parameters exports input state; saving a displayed candidate uses the existing comparison snapshot path with a clear label.

No financial data in URLs, logs or analytics. No new services, libraries, tracking or external submission.

## 6. UI and graph changes

Use the existing field cards/grids, `SettingsFields`, supplementary editors, `SummarySection`, status copy patterns and native disclosure elements. Reuse responsive and validation behaviour. The proposed additions are:

- revised bridge step configuration and review copy;
- a compact optimisation summary, with current status and required/reducible monthly contributions;
- an expandable contribution breakdown and assumptions/search-limit explanation;
- a small selector: **Current contributions** / **Modelled contribution scenario**, only when both exist;
- a pending/retry/unavailable state that preserves the last completed, explicitly labelled result.

Example: “With your current contributions, the model finds a shortfall from age 58. This scenario meets the target through age 90 with an additional £X a month in the modelled payments shown below.” For a reduction: “The target is already met in this model. A scenario with £X less in monthly payments also meets it. This estimate depends on the assumptions shown.” Never say suitable, guaranteed, best investment, or that the user should reduce payments.

**No graph changes required.** `RetirementIncomeChartAdapter` already accepts complete data/parameters/limits, `readOnly`, `showParameterControls` and descriptions. For the proposed automatic candidate preview, use the existing read-only presentation and hide manual parameter controls; retain the shared target/retirement input controls outside the graph if rapid edits are desired. Its underlying graph, series/layout, accessibility implementation and drawing code remain unchanged. This interaction change is a product choice in section 9, not an unnoticed loss of editing.

If preserving every current graph drag interaction is required, define manual-override semantics first. Map edits to explicit baseline changes or pinned decisions in the shell, invalidate/recompute the solver, and never let a drag silently contradict automatic timing. Existing props may suffice; any graph change needs a demonstrated missing capability and a separate minimal explanation. A new chart, second chart engine or optimisation-specific series format is unnecessary.

Preserve standard results composition and the existing mobile table policy. The contribution/sequence text provides a non-visual equivalent. Pending updates must not announce a stale candidate as satisfying newly entered targets. Never expose worker stack traces or raw financial payloads in error messages.

## 7. File-level implementation plan

Paths below are relative to this repository; proposed new names are suggestions, not existing files.

| Files                                                                                                                | Action and reason                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app-domains/journeys.ts`, `src/app/mode-selection.tsx`                                                          | Modify bridge steps, automatic-mode defaults and goal-seeking copy. Keep IDs and other journeys.                                                                                    |
| `src/app-domains/bridge-plan-review.ts`                                                                              | Replace user-designed withdrawal review with baseline assets/payments and disclosed automatic assumptions.                                                                          |
| `src/fieldDefinitions.ts`, `src/app/settings-group-supplementary-editor.tsx`                                         | Reuse/add shared fields for approved goal inputs and prospective Added Pension; expose existing pot schedules in bridge. Only change supplementary editor behaviour where required. |
| `src/settings/settings-types.ts`, `settings-defaults.ts`, `settings-normalize.ts`, `settings-validate.ts`            | Add/validate policy and optional prospective payment fields; preserve disabled behaviour.                                                                                           |
| `src/settings/settings-storage.ts`, `settings-migrations.ts`, `settings-versions.ts`                                 | Round-trip new fields and define legacy/manual transition without silent conversion of saved plans.                                                                                 |
| New `src/settings/settings-domains/retirement-goal.ts`                                                               | Pure policy validation/materialisation of automatic reference settings and supported candidate constraints. No browser APIs. May be split only if responsibilities warrant it.      |
| `src/settings/settings-domains/alpha-pension.ts`, `src/row-assembly.ts`                                              | Resolve/validate the prospective Added Pension payment at each date, preserving historical treatment. Reuse domain factors.                                                         |
| `src/calculation/retirement-plan.ts`                                                                                 | Optional generic goal orchestration and result contract; recursion guard and exact candidate calculator reuse. Preserve current fast/full work.                                     |
| New `src/calculation/retirement-goal.ts` and adjacent types/search helpers only if needed                            | Pure candidate generation, constraints, bounded search, contribution deltas and diagnostics. No duplicate financial engine.                                                         |
| `src/app/use-journey-settings.ts`, `src/app/chart-state.ts`, `src/app/use-app-controller.ts`                         | Bridge activation/transition, input updates, selected-scenario ownership and reset/cancellation. Keep shared update functions' default behaviour unchanged.                         |
| `src/app/use-projection-calculations.ts`, `retirement-plan-calculation-worker.ts`, `retirement-plan-result-cache.ts` | Typed goal options, complete request/cache identity, stale-response protection, worker budget/failure behaviour.                                                                    |
| New `src/result-projection/retirement-goal.ts`                                                                       | Pure goal summary/sequence/contribution semantics consuming canonical results; no JSX or recalculation.                                                                             |
| New `src/app/retirement-goal-summary.tsx`, `src/app/journey-step-content.tsx`                                        | Compact summary/selector/disclosures and selected-result plumbing. Reuse existing graph props.                                                                                      |
| `src/app/comparison.tsx`, `use-comparison-state.ts`, comparison storage/state/cache modules as actually needed       | Save/load displayed fixed scenarios with matching settings; prevent recursive optimisation and accidental baseline replacement. Avoid changing unrelated comparison logic.          |
| `README.md`, `src/pages/methodology.tsx`                                                                             | Describe objective, search limits, future-only payments, access/withdrawal distinction, conditional feasibility and preserved scope.                                                |
| Relevant adjacent tests, `features/`, `e2e/app.spec.ts`, `e2e/a11y.spec.ts`                                          | Observable behaviour, finance, compatibility, async and accessibility coverage below.                                                                                               |
| `src/generated/acceptance-features.ts`                                                                               | Regenerate from changed features; never edit by hand.                                                                                                                               |
| `scripts/benchmark-calculations.ts`                                                                                  | Extend existing benchmark cases if needed to establish solver budget/performance.                                                                                                   |

Remove **no production files**. Remove only obsolete bridge step/control configuration. Leave the legacy Added Pension estimator unless a separately justified cleanup is necessary. Do not change factor JSON, pension/tax formulas or graph code just to support orchestration. The prospective Added Pension temporal contract is the deliberate, separately tested calculation change.

Implementation sequence: resolve blocking decisions; add prospective payment and policy compatibility contracts; implement pure search against production calculations; integrate worker/caches; wire selected results and bridge fields; update specifications/docs; run cumulative verification. Keep financial changes independently reviewable.

## 8. Testing and verification strategy

### 8.1 Production calculation tests

Use fixed dates and real `calculateRetirementPlan` calls. Add small transparent zero-growth/no-tax fixtures where expected outcomes can be independently derived, then taxable real-world-shaped cases. Do not recreate an alternative pension calculator inside tests.

| Case                              | Required observable assertion                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target already achievable         | Current contribution route passes full-horizon canonical assessment; additional required is zero, not missing.                                                                                                                        |
| Current funding insufficient      | Baseline shortfall remains visible; candidate changes only allowed future contributions/timing; final candidate passes.                                                                                                               |
| Required contribution             | Exact displayed amount is recalculated and feasible; adjacent lower value fails for a controlled single-variable fixture. No global-minimum assertion for heuristic multi-variable cases.                                             |
| Over-contribution                 | Lower ongoing payments remain feasible; original balance/accrual/history and fixed lump sums are unchanged. Include zero required ongoing payments.                                                                                   |
| Retirement before SIPP/AVC access | No inaccessible withdrawals; ISA bridge plus pension later can be found. Include mixed contributions where neither single channel works alone.                                                                                        |
| Retirement before LISA 60         | LISA not used early; contributions stop at 50 and annual bonus cap applies across monthly and lump-sum payments. Aged-50+ member retains existing balance but gains nothing from future LISA contributions.                           |
| DB begins later                   | Timing trades bridge spending against reduction, with canonical Alpha/EPA/classic/nuvos/Premium rules. Different NPA scenarios and quarterly candidates.                                                                              |
| Added Pension                     | Pre-effective-date rows invariant; prospective increases/reductions change only future purchases; no extra accrual beyond leave/support date; no double counted statement benefits. Legacy plans without override reproduce old rows. |
| AVC                               | Gross pot additions kept separate from SIPP net-cost inputs; correct taxation/shared lump-sum allowance and protected access.                                                                                                         |
| Insufficient/unsupported          | No accessible bridge source, zero balances, no accumulation time, capped contributions and missing factors have differentiated results. Search exhaustion never claims impossible.                                                    |
| Edge ages/dates                   | Current age equals retirement, next admissible quarter, April 2028, protected 50, LISA 50/60, Added Pension 68 boundary, NPA 60/65/68, draw at horizon and malformed dates. No silent retirement delay.                               |
| Numerical behaviour               | Tax non-convergence, missing/NaN outputs, cap plateaus, rounding, deterministic ties, duplicate candidate handling and search-budget exhaustion.                                                                                      |
| Tax/inflation                     | Scotland/rest-of-UK, real/nominal, SIPP relief options, depleted nominal lump-sum allowance, unconfirmed State Pension dependency, Spending Smile.                                                                                    |
| Sequence                          | Actual first use can be later than eligibility and intermittent; priority changes do not create duplicate money.                                                                                                                      |
| Search quality                    | Small finite domains exhaustively enumerated in tests as a comparator to expose poor heuristics; known mixed-channel solution found within budget. Record approximation honestly.                                                     |

Preserve existing production domain suites. `added-pension-goal.test.ts` continues to describe its old helper; it is not evidence for the new solver.

### 8.2 State, results, persistence and components

- Baseline contributions remain unchanged after calculation, selecting a scenario, saving it or switching modes.
- All displayed graph props, summaries, table and saved comparison settings come from one selected result; assert `createComparisonResult` identity invariants.
- Obsolete workers cannot commit after input edits, mode changes, import, reset, clear-all or retry. Cover rejection, unsupported Worker, budget limit and no main-thread runaway fallback.
- No new calculation on Home or input steps; Results triggers it. Fast/full preview enrichment does not rerun the entire goal search unnecessarily.
- Loading old per-journey and flat exports retains manual meaning until explicit conversion. New fields, null/zero and policy version round-trip. Simple/Expert and joint settings remain unaffected.
- Test populated raw local storage plus retained candidates through disable saving, clear-all, edit, re-enable saving and reload. No cleared values return. Do not rely only on default-returning loaders.
- Guided controls removed, factual protection/tax/contribution inputs retained, optional schedules visible, invalid inputs preserved with actionable navigation.
- Existing graph rendered with unchanged implementation; desktop/mobile, keyboard, focus, zoom, statuses and text equivalents remain usable.

### 8.3 Gherkin and browser coverage

Update `features/modeller-journeys.feature` assertions requiring bridge withdrawal rate/use-by fields, the manual strategy step and `use_by_age` defaults to describe the newly approved automatic mode. Preserve manual forward-model scenarios under their applicable mode; do not delete “configured withdrawals rather than a hypothetical bridge” engine coverage.

Add goal-seeking business examples to `features/retirement-bridge.feature` or a focused `retirement-goal.feature`: existing contributions sufficient, additional ISA+SIPP payments, surplus reduction, later DB entitlement, no permitted bridge source, future-only Added Pension and search limits. Update `features/step-definitions/product-acceptance.steps.ts` or add focused steps that call canonical production calculations and application actions. No acceptance-only solver and no Playwright in Gherkin.

Relevant regression features include `flexible-withdrawals`, `sipp`, `cs-avc`, `lifetime-isa`, `alpha-pension`, `premium-pension`, `income-tax`, `quarter-year-ages`, `comparison-results` and `local-privacy`.

Update the existing **completes the bridge journey** Playwright test in `e2e/app.spec.ts`; include current/proposed scenario switching, contribution messages, comparison snapshot, refresh, graph visibility and smaller viewports. Retain simple, Expert and joint browser regressions. Run `e2e/a11y.spec.ts` with the new summary/selector states; include keyboard selection and live-status checks beyond axe.

### 8.4 Commands required during implementation

```bash
npm run generate:acceptance
npm run check:acceptance
npm run format:check
npm run lint:hook
npm run typecheck:all
npm run test
npm run test:bdd
npm run build
npm run test:e2e
npm run test:a11y
```

Run focused tests while developing, then the cumulative required gates. Given this change's breadth, `npm run check` is an appropriate final quality gate and subsumes several commands above, including coverage. Include `npm run test:smoke:prod` if changing production entry points, consent, static navigation or relevant worker/bundle delivery. Use `npm run benchmark:calculations` to establish search performance. Do not run audit-fix, add dependencies or expand to unrelated financial fixes.

### 8.5 Verification performed for this specification

Read production code, relevant methodology/README sections, design guidance, Gherkin and test assertions. Ran:

```bash
npm run test -- src/calculation/retirement-plan.test.ts src/calculation/retirement-plan-assessment.test.ts src/projection-domains/flexible-withdrawals.test.ts src/app-domains/journeys.test.ts src/app-domains/bridge-plan-review.test.ts
```

Result: **5 files, 66 tests passed**. A direct read-only `node --import tsx` calculation confirmed the historical Added Pension effect described above. An initial `tsx` CLI attempt could not create its IPC pipe in the sandbox; the Node import invocation succeeded without that IPC requirement.

No application implementation was changed. Full lint/typecheck/build/BDD/browser suites were not run for this analysis; the focused tests do not establish that the proposed solver exists or works. Repository-wide `npm run format:check` passed after formatting the two new Markdown documents.

## 9. Open product and domain decisions

These are unresolved choices, not requirements already agreed by the user. Resolve the blocking items before implementing the affected financial behaviour. The recommendation column supplies defaults to discuss, not silent authorisation.

| Decision                                          | Ambiguity / consequence                                                                                                                                                                                                 | Recommended default                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blocking: objective/cost basis**                | SIPP net cost is not comparable with AVC gross additions or Added Pension payments as household take-home cost. True net-cost comparison needs more tax/earnings information.                                           | First release minimises disclosed model-input monthly increments, with per-account bases. If “lowest personal cost” is required, agree the cost-model extension first.                                                                                                                                                  |
| **Blocking: legal/eligibility headroom**          | Software caps do not enforce shared ISA subscriptions, pension annual allowance/taper/MPAA/earnings relief or remaining Added Pension entitlement. Allowing unlimited algorithmic use can produce an unavailable route. | Keep existing accounts/eligibility fixed, add the minimum confirmed headroom/eligibility inputs necessary, constrain calculable shared ISA/LISA limits, and label unresolved pension checks. Do not claim an executable/suitable route when checks are missing. Agree whether conditional illustrative outputs suffice. |
| **Blocking: accrued Added Pension input meaning** | No separate accrued field; benefits may already be in the statement total. Extra input risks double counting.                                                                                                           | Preserve statement total and identified post-statement purchases; add future-only payment override. Add a separate accrued component only after defining statement inclusion/revaluation rules.                                                                                                                         |
| **Blocking: existing bridge transition**          | Automatically changing saved timing/strategies changes old plan meaning.                                                                                                                                                | Preserve existing saves/snapshots in explicit manual compatibility mode; offer “Model a route to my target” conversion in the same journey. New bridge plans are automatic. No hidden backup copy or silent migration.                                                                                                  |
| **Blocking: graph interactions**                  | Automatic timing conflicts with freely dragging pension/pot ages.                                                                                                                                                       | Use existing read-only graph mode for calculated candidates and shared target/retirement fields outside it; keep manual graph editing for manual/Expert plans. If every drag must survive, define pins and re-optimisation semantics first.                                                                             |
| **Blocking: service and new payments**            | Active Alpha membership and eligibility to increase AVC/Added Pension cannot be inferred from merely owning benefits.                                                                                                   | Explicitly retain leave/service assumptions and confirm channels allowed for additional payments. Do not auto-enable a new product because it is mathematically useful.                                                                                                                                                 |
| Search guarantee                                  | “Minimum” may mean an exact global solution or a reasonable approximate route. Exact full search across all quarterly ages and mixtures is much larger.                                                                 | Bounded deterministic best-found solution, with precision/domain/budget stated; no global-optimum claim.                                                                                                                                                                                                                |
| Cost over time                                    | Lowest monthly payment can differ from lowest total contribution because LISA/Added Pension stop earlier.                                                                                                               | Optimise monthly input change; also show contribution end dates. Do not silently switch to lifetime capital minimisation.                                                                                                                                                                                               |
| Reallocation/reductions                           | Reducing one current payment to increase another might lower total cost but is more interventionist.                                                                                                                    | Increases-only for underfunding; reductions-only for overfunding. Preserve schedules and acquired rights.                                                                                                                                                                                                               |
| DB age domain                                     | Search to NPA only or include supported later starts? Pensions already in payment cannot be retimed.                                                                                                                    | Search supported quarter years through current model upper bounds, include NPA, fix already-started benefits, disclose supported-scheme simplifications.                                                                                                                                                                |
| State Pension deferral                            | Automatic route might otherwise search deferral too.                                                                                                                                                                    | No deferral optimisation; use entitlement date for new plans and retain explicit existing deferral/in-payment facts.                                                                                                                                                                                                    |
| Surplus reserve                                   | “Target met” might mean exactly funded or include a contingency/bequest. No reserve target is specified.                                                                                                                | Existing deterministic lifetime target only, no invented safety margin; clearly state sensitivity to assumptions.                                                                                                                                                                                                       |
| Spending profile                                  | Simplification could remove current Spending Smile capability.                                                                                                                                                          | Flat by default, optional existing disclosure, preserve imported phase settings.                                                                                                                                                                                                                                        |
| Inaccessible beyond-horizon assets                | Current enabled-account validation rejects draw after horizon even if an unused asset could simply remain held.                                                                                                         | First release reports this unsupported setting; do not silently disable the asset. Supporting held-but-never-accessed assets needs an explicit validation/model extension.                                                                                                                                              |
| Accumulation start boundary                       | Existing flexible-pot draw validation requires draw strictly after today. Immediate retirement can therefore lack a valid first withdrawal date.                                                                        | Explain unsupported immediate-start cases; do not silently move retirement. Extend boundary semantics only with a specific regression-tested decision.                                                                                                                                                                  |
| Search budget                                     | Some mixed-scheme cases may need many projections, especially with tax iteration.                                                                                                                                       | Named deterministic evaluation budget, benchmarked on representative hardware, with honest partial-search status.                                                                                                                                                                                                       |

Authoritative context checked during analysis: the official [LISA rules](https://www.gov.uk/lifetime-isa) describe its own cap/bonus/age rules; [ISA subscription rules](https://www.gov.uk/individual-savings-accounts/how-isas-work) describe the shared annual allowance. [Pension tax-relief guidance](https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief) and [annual-allowance guidance](https://www.gov.uk/tax-on-your-private-pension/annual-allowance) establish restrictions beyond the modeller's slider caps. Civil Service guidance confirms separate [Added Pension purchase limits](https://www.civilservicepensionscheme.org.uk/employerhub/kbarticle/?id=KA-01152). These references identify scope gaps; this task has not audited every scheme rule or authorised new factor data. Re-verify applicable publications and record provenance before adding enforcement rules.

## 10. Implementation handoff

The companion [implementation prompt](retire-early-implementation-prompt.md) is self-contained about the intended implementation and references this detailed specification. It explicitly distinguishes the user's settled requirements from the unresolved decisions above. An implementing task must not treat proposed defaults as decisions already made.
