# Implementation prompt: evolve Retire Early into goal seeking

Implement the approved scope of `docs/retire-early-implementation-spec.md` in `/Users/rowan/Documents/github/cs-pension-modeller`. Read that specification and the repository's current `AGENTS.md`, README, methodology and design guidance first. The specification was investigated on 19 September 2026 at HEAD `be88d9c` plus an uncommitted working tree; re-inspect current code and preserve unrelated changes, especially existing calculation-worker/cache work.

The user wants the existing **Work out what I need to retire early** journey (`bridge`, definition ID `early-retirement-bridge`) to calculate a modelled route to a target retirement age and after-tax retirement income. They do not want a new journey, a new pension engine or a results-page redesign. Implement the smallest coherent change. Do not add dependencies, broadly refactor, change scheme factors, invent financial rules, send financial data externally, or imply personal suitability or official scheme affiliation.

## Requirements already settled

- Retain personal details, horizon, retirement age, after-tax target, current balances/accrued benefits, ongoing contributions and facts needed by existing calculations.
- Reuse supported ISA, SIPP, LISA, Civil Service AVC, Alpha Added Pension and DB entitlement calculations. Other guaranteed income and State Pension remain supported inputs.
- Remove manual pot access/withdrawal sequencing questions from automatic bridge modelling where the model can derive them. Keep shared fields and Expert capability intact.
- Assess whether current contributions meet the target throughout retirement. If not, calculate an approximate additional-contribution scenario; if they do, calculate a lower-contribution scenario where possible.
- Preserve entered baseline contributions. Displaying/saving a proposal must not silently replace them or change past pension accrual.
- Reuse `calculateRetirementPlan`, canonical assessment/diagnostics, target-based withdrawals, tax/allowance calculations, published factors and inflation/growth assumptions.
- Preserve the existing results graph implementation. Prefer supplying a complete selected canonical result/settings through existing adapters. No graph redesign or new chart calculation path.
- Add only a concise optimisation explanation, contribution differences, actual drawdown sequence and material assumptions. Preserve summary/comparison/table capability, privacy, accessibility and mobile use.
- Preserve simple/Expert behaviour, legacy files and saved comparisons through deliberate migration and regressions.

## Decisions that are not yet agreed

The specification proposes defaults, but the original user did not settle these. Check this task's conversation for answers. If unresolved, collect the material choices together before implementing dependent financial behaviour; continue independent repository inspection and test design. Do not silently invent approval.

1. Is minimising the sum of **model-input monthly payment increases**, with clearly labelled different contribution bases, acceptable? SIPP is net cost, AVC is gross pot additions, and Added Pension has no comparable personal-cost model. True lowest take-home cost requires a separately agreed extension.
2. Can outputs remain conditional on unmodelled pension eligibility/allowance checks, and what confirmed contribution headroom/eligibility inputs should constrain the search? Software maxima are not legal/affordability limits. Decide shared ISA/LISA cap enforcement and remaining Added Pension eligibility.
3. Confirm how already purchased Added Pension is included in statement totals, avoiding a duplicate accrued benefit.
4. Accept preserving old bridge plans as explicit manual scenarios, with automatic mode for new plans and a user-selected conversion for existing ones?
5. Accept the existing graph's read-only mode for automatic candidates, with shared target/retirement controls outside it? Otherwise define the meaning of manual age drags/pinned assumptions before coding them.
6. Confirm active-service/eligible-account assumptions for increasing AVC/Added Pension/LISA payments.

Recommended defaults are detailed in section 9 of the specification. The bounded search is approximate, not a guaranteed global minimum. Do not represent any still-unresolved item as an agreed requirement.

## Concrete implementation boundaries

Journey configuration is in `src/app-domains/journeys.ts`; mode entry is `src/app/mode-selection.tsx` and `use-app-mode-state.ts`. Shared step rendering is in `src/app/journey-step-content.tsx`, `journey.tsx` and `SettingsFields`/supplementary editors. Update `buildBridgePlanReview` in `src/app-domains/bridge-plan-review.ts`. Keep existing field components and expose retained lump-sum schedules rather than hiding financially active assumptions.

State is owned by `src/app/use-journey-settings.ts`, `use-app-controller.ts` and shared updates in `chart-state.ts`. The contract/normalization/validation/storage/migrations live under `src/settings/`. Add a generic optional goal policy, disabled for ordinary forward plans, rather than passing journey identity into domain functions. Materialise valid automatic reference timing/strategies in the baseline settings through explicit application actions; never add a hidden calculation overlay. Allocate the next schema version from current code. Preserve null, zero, historical inputs and legacy manual meaning.

Important prerequisite: `alphaAddedPensionMonthly` currently also affects historical rows from the ABS. `row-engine-with-pension-increases.ts` calls `calculateAddedPensionValues` in `row-assembly.ts` for those rows. Add a dated optional prospective monthly contribution override, defaulting to no override for legacy plans. Resolve the applicable payment by row date and feed the existing Added Pension calculation. The solver can vary only the future override. Prove that increases and reductions leave all pre-effective-date rows unchanged. Do not fix unrelated historical calculations silently.

Add pure goal search under `src/calculation/`, called by the canonical `calculateRetirementPlan` entry. Extend `RetirementPlanResult` with optional typed goal analysis, and add an explicit option to disable goal recursion for candidate evaluations. A callback to the real canonical calculator can avoid circular imports. Keep pension rows, tax, bridge diagnostics and assessment calculation-owned; result projections must not run calculations.

The solver should:

1. Hold target/horizon, balances, accrued benefits, growth, inflation, salaries, lump sums and tax settings fixed.
2. Use `meet_income_target` for enabled flexible accounts. Derive earliest valid flexible access from candidate-date-sensitive SIPP/AVC resolvers, LISA 60 and existing validation. Eligibility does not force actual withdrawals.
3. Search supported quarter-year DB ages and a bounded set of account priority permutations, including NPA/earliest/manual seeds. Preserve already-started benefits and earlier Civil Service leave facts. Do not search State Pension deferral or unsupported factors.
4. Search mixtures of future monthly contributions, including ISA bridging before pension access. Use feasible upper-bound vectors, bounded coordinate bisection/reduction, multiple deterministic orders and bounded pairwise exchanges as described in section 4.5. Revisit timing around improved contributions. Keep the best verified candidate.
5. Use the approved objective; underfunded routes increase permitted contributions only, while reduction scenarios reduce future ongoing payments only. Do not reallocate or invent capital unless explicitly approved.
6. Treat valid settings, full projection coverage, finite outputs, supported factors, settled tax/withdrawal iteration and `assessment.meetsTargetThroughout` as mandatory for model feasibility. Retain the existing £1 cumulative shortfall tolerance and unconfirmed State Pension warning/sensitivity.
7. Keep invalid/unsupported/unsettled/search-limited/no-route-found distinct. A failed capped vector or heuristic search does not prove impossibility. Bisection is local to a checked fixed-order/single-coordinate bracket; handle non-monotone cases explicitly.
8. Round displayed payments conservatively, recalculate the exact final vector, and retain precision/search-budget diagnostics. Never claim an exact global minimum.

Use no heavyweight optimisation dependency. Bound unique candidate evaluations and retained results; benchmark the initial suggested 4,000-evaluation policy before finalising it. Search is worker work. Extend request/options/cache identity in `retirement-plan-calculation-worker.ts`, `retirement-plan-result-cache.ts` and `use-projection-calculations.ts`; preserve their current fast/full preview behaviour and stale-result invalidation. Do not run thousands of calculations synchronously when a worker fails. Do not recompute the whole search merely to enrich withdrawal previews.

Keep the canonical editable baseline separate from immutable candidate snapshots. The shell chooses the displayed result; pass its settings to `projectRetirementPlanControls`, its rows/settings to `projectRetirementPlanResult`, and the same result to summary, table, inflation and comparison. `createComparisonResult` rejects mismatched settings: do not bypass that invariant. Save the displayed candidate as an ordinary fixed forward snapshot with goal search disabled and any dated Added Pension override retained. Loading it must not silently optimise again or destroy the baseline.

Use `RetirementIncomeChartAdapter`'s existing data, parameter, limit and presentation props, including `readOnly`/`showParameterControls` if approved. Leave `src/RetirementIncomeChart.tsx`, chart layout/series code and graph rendering unchanged unless a specific missing capability makes a change imperative. Explain any such change before expanding scope.

Add a small semantic goal-result projection and shared-style summary component. Show current feasibility, current/required/delta payments with units/bases, first gap, uncovered spending, sequence/actual first use and important caveats. Distinguish contribution reduction from existing avoidable-withdrawal surplus. Keep the last completed result labelled while updating; error messages must be actionable and contain no internal details.

## Tests and completion

Add production-calculator unit/integration tests for current target success/failure, contribution solving and reductions, mixed ISA+pension funding, SIPP/AVC access before/after April 2028 and protected access, LISA ages 50/60 and caps, later DB benefits, Alpha/EPA/Added Pension history, AVC contribution basis, unsupported Premium factors, zero balances, no accumulation time, edge ages, rounding, non-convergence, deterministic ties and exhausted search budgets. Use small exhaustive finite fixtures to evaluate heuristic quality; do not create an acceptance-only calculator.

Cover baseline preservation, consistent selected graph/settings/summary/table, snapshots, imports/migrations, mode isolation including Expert joint plans, stale worker responses and failures, and populated storage/retained-state clearing through subsequent edits/reload. Preserve existing core forward-modelling tests.

Update `features/modeller-journeys.feature` bridge manual-control/default assertions and add goal business scenarios in `features/retirement-bridge.feature` or a focused new feature. Steps must call production calculations/application actions. Keep configured-withdrawal behaviour covered for ordinary forward/manual plans. Regenerate `src/generated/acceptance-features.ts`.

Update the bridge browser journey in `e2e/app.spec.ts` plus accessibility coverage for the summary/selector and keyboard/mobile behaviour. Update README/methodology to match implemented scope, objective and limitations.

During implementation run focused tests; before completion run:

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
npm run benchmark:calculations
```

`npm run check` is the appropriate broad final gate and may substitute for its included commands, including coverage. Include `npm run test:smoke:prod` if production entry points, worker/bundle delivery, consent or static navigation are affected. Do not bypass failures or retag failing scenarios pending. Report commands/results, unrelated failures and omissions honestly.

Finish with a concise account of implemented behaviour, files changed, Gherkin impact, verification, remaining product/domain limitations and any necessary departure from this specification. Do not claim a globally optimal financial recommendation or complete allowance/eligibility validation that the application does not provide.
