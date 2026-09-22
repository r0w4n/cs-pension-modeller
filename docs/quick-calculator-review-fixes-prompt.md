# Repair prompt: Quick Alpha calculator review findings

This document is a handoff for a subsequent implementation task. Preparing it
does not authorise the current prompt-writing task to change application code.

## Objective and scope

Resolve the six findings from the 22 September 2026 review of the Quick Alpha
calculator, and add meaningful regression coverage for the affected behaviour.
Work in `/Users/rowan/Documents/github/cs-pension-modeller/`.

Preserve the existing Simple, Early retirement and Expert journeys, including
their controls, saved inputs, calculations, comparisons and privacy behaviour.
Keep the quick calculator separate. Use the current calculation engine and
shared controls; do not add financial rules, dependencies, new journeys,
analytics, or code from the old calculator.

Read `AGENTS.md`, the relevant README/design guidance, and
`docs/quick-calculator-implementation-prompt.md`. This repair prompt narrows the
work to the review findings; do not restart the implementation or undertake
unrelated work from other specifications.

Inspect `git status` and the existing diff before editing. The implementation
currently includes tracked modifications and untracked source/test files;
preserve that work. The reviewed base commit was `d1bd691`. Recheck current
code rather than relying on old line numbers. Use the pre-implementation version
of shared controls as evidence for their previous behaviour, not as a reason
to revert the entire file.

The review was static: no automated tests were run. Do not treat its findings,
the existing test files, or prior implementation claims as evidence of passing
verification.

## 1. Make strict currency validation opt-in

**Finding:** `CurrencySettingFieldEditor.commitValue` in
`src/app/form-field-values.tsx` now always calls `validateCurrencyDraft` and
returns on an invalid draft. Existing journey callers do not provide
`onDraftStateChange`, so the input can visibly change while the model silently
retains its previous value, with no error. This changes existing functionality.

Required repair:

- Introduce a clearly named optional strict-draft capability, or use the
  existing draft callback as the explicit opt-in if that contract is clear.
  Existing callers that do not opt in must retain their previous commit,
  normalisation, reset and preset behaviour.
- Opt the quick calculator's relevant currency fields into strict validation
  and wire their draft state to visible errors and calculation gating. This
  includes the editable State Pension amount while that source is enabled;
  otherwise a rejected amount can leave apparently current results underneath.
- In strict mode, preserve empty, invalid, negative and out-of-range drafts.
  Do not commit them or turn them into zero. Explicit zero is valid where the
  field permits it. Disabling an optional source may remove its validation
  from calculation gating without destroying the entered draft.
- Validate using the displayed units. If `displayDivisor` is used, convert
  bounds consistently before comparing the displayed amount; report limits
  in those same units. Do not change the underlying canonical amount basis.
- Ensure a change to completion/error metadata does not change the editor's
  React key and discard the draft or keyboard focus. Currently the key includes
  `initialDraftValue`, which changes when a previously completed answer becomes
  invalid. Remount only for intentional reset/external-state replacement.
- Keep successful commits, presets and field resets consistent with completion
  and dirty-state reporting so a valid input cannot leave results permanently
  suppressed.

Regression evidence: test both opt-in and unchanged existing callers. Include
populated value → blank/negative/excessive draft → blur, retained draft/error,
no invalid commit, correction to a valid value, explicit zero, applicable
display-unit conversion, and reset/preset transitions. Assert the canonical
value and visible draft independently.

## 2. Validate raw EPA schedules before normalisation

**Finding:** `createQuickCalculatorBaseSettings` in
`src/calculation/quick-calculator-scenarios.ts` normalises input before
validating it. The EPA normaliser replaces missing/invalid dates with fallback
dates. Clearing an enabled EPA period can therefore produce a valid-looking
calculation using dates the user did not enter.

Required repair:

- Validate enabled EPA period input before calling a normaliser that can repair
  it. Missing start/end dates and malformed calendar dates must produce
  field/item-specific validation outcomes. Preserve the user's raw editor
  values; never manufacture a purchase history.
- Keep validation deterministic with explicit inputs. Reuse existing date
  helpers, issue types and period editor. Do not change global migration or
  normalisation semantics to solve this quick-page problem.
- Make the builder/controller boundary explicit: incomplete raw inputs return
  actionable issues rather than a supposedly usable normalised base. Render
  these issues without requiring a successful calculation batch first.
- Keep existing canonical checks for reversed/overlapping periods, unavailable
  EPA options and periods outside a scenario's accrual interval. A problem
  specific to one retirement scenario must not unnecessarily hide unrelated
  valid scenarios. An invalid shared enabled schedule affects all scenarios
  that use it.
- With EPA disabled, retain the draft schedule but exclude it from active
  validation/calculation. Re-enabling must restore its errors until corrected.

Regression evidence: use the real editor/controller path to clear each date
of a populated enabled period and show that no fallback-date estimate is
presented as current. Cover valid correction, disabling/re-enabling, overlap,
and a period usable for only one retirement age. Pure tests must verify that
invalid raw input is rejected before any repair occurs.

## 3. Reject past retirement dates for quick comparisons

**Finding:** `runQuickCalculatorScenarios` relies only on `validateSettings`.
That validator does not reject Alpha draw dates before the calculation date.
The quick calculator can therefore label estimates as retirement in the past,
even when the entered statement is later than that retirement date.

Required repair:

- Add a quick-scenario eligibility check using existing date arithmetic:
  construct the retirement date from that variant's birth date and retirement
  age, then compare it with the batch's captured calculation date.
- Dates strictly before the calculation date are unavailable. Retain existing
  canonical handling for equality; do not invent a broader pension rule.
- Return a clear scenario issue explaining that the quick calculator models
  prospective retirement and cannot reconstruct retirement already taken.
  Do not move or clamp the user's selected age into the future.
- Apply this independently to both normal-age and selected-age scenarios.
  A past normal-age row must not hide a valid future selected-age row.
- Do not change `validateSettings` globally, since full-modeller support and
  historical scenarios have a different scope. Keep the scenario setting's
  start date and reported batch calculation date consistent.

Regression evidence: with calculation date `2026-09-22`, birth date
`1959-06-01`, statement year `2026`, and selected retirement age `68`, the
normal-age variants must be unavailable and valid selected-age variants remain
available. Also cover a manually selected past age, same-day versus
previous-day boundaries, and selected age equal to NPA. Assert issue/result
contracts and the rendered availability, not only the configured ages.

## 4. Propagate quick reset to every open calculator

**Finding:** the quick-key storage-event handler in
`src/app/quick-calculator/use-quick-calculator.ts` handles only a `loaded`
outcome. Reset removes the key, so another open calculator ignores the empty
outcome, retains old inputs/results, and writes those cleared values back on
its next edit.

Required repair:

- Handle removal of `QUICK_CALCULATOR_STORAGE_KEY` before the ordinary
  external-update guard for dirty or invalid drafts. Reset must clear old
  state even if that tab is editing an invalid answer.
- Cancel/terminate active work, advance invalidation identity, clear retained
  results and drafts, reset completion flags, and restore quick defaults with
  required answers unanswered. Delayed worker messages must not restore a
  cleared batch.
- Keep quick reset distinct from global clear. It must not alter other plans,
  comparisons, selected mode, saving preference, acknowledgement or consent.
  Global clear/disable-saving continues to use its existing broader semantics.
- A tab receiving a reset must not immediately write default state back or
  echo the event. Its next edit may save only new post-reset values.
- Keep ordinary validated external updates separate from reset events. They
  must not silently discard a locally invalid draft. Handle external malformed
  values as unavailable storage, not as permission to calculate repaired data.
- Check removal outcomes in the originating reset action. Do not announce
  successful removal if storage deletion failed; use the existing honest
  failure/status pattern while clearing local in-memory results appropriately.

Regression evidence: populate raw quick storage and retained state in two
open calculators; reset one while the other has an invalid draft or a pending
worker. Verify raw key removal and reset state in both, deliver a stale worker
response, edit one new field, and reload. None of the old values may return.
Assert that populated full-modeller plans/preferences/comparisons remain
unchanged. Also exercise global clear and disable-saving followed by edits,
re-enabling saving and reload.

## 5. Prevent invalid range drafts from committing on blur or Enter

**Finding:** `RangeSettingField` reports invalid drafts while typing, but its
blur/Enter path still calls `commitValue`. That function clamps the number and
emits `committed`, which clears the quick controller's error. Negative earnings
become accepted zero; excessive earnings become the maximum.

Required repair:

- In the opt-in strict mode, apply the same raw draft validation before blur
  and Enter commits. Invalid input must retain its text/error, keep the
  previous canonical value separate, and suppress current estimates.
- Preserve existing behaviour for callers that do not opt in. Use the shared
  control; do not create a second slider implementation.
- Wire draft reporting for the quick page's editable range assumptions, not
  just required earnings, so an invalid age/payment/percentage draft cannot
  leave estimates looking current. Distinguish input completion from validity:
  optional/defaulted inputs still need validation when edited.
- Preserve existing quarter-year requirements and dynamic range bounds.
  Pointer/keyboard slider commits are valid values and should continue to
  work without being treated as unanswered exact-input drafts.
- Keep explicitly entered zero visible as zero after commit where allowed;
  the earnings field's existing `emptyWhenZero` display convention must not
  make a completed quick answer look unanswered.

Regression evidence: test negative/over-maximum values, blank, valid zero,
non-quarter-year ages, correction, blur and Enter. Assert no invalid `onChange`
or committed event occurs, and verify integration with the real controller's
result suppression/recovery. Exercise valid slider interaction too.

## 6. Replace acceptance-only simulations with production behaviour

**Finding:** several steps in
`features/step-definitions/quick-calculator.steps.ts` assign values to test-world
properties and then assert those assignments. They do not establish the user
outcomes named by the scenarios.

Repair all affected steps, including:

- “all local data is cleared through the application action”: currently sets
  `quickStoredAccrued` and `retainedResults` to null without calling an action.
- “edits inputs, enables saving and reloads”: currently copies `321` between
  properties without storage, a saving action, or a production loader.
- Quick reset/isolation: currently clears test-world inputs rather than
  exercising the production reset and populated application stores.
- Unanswered inputs: currently asserts that the test never created a batch,
  rather than exercising production readiness/validation behaviour.
- Reduced Added Pension: currently multiplies two settings inside the test,
  rather than proving the canonical projection actually applies the reduction.
- Annual/before-tax/real-terms labels: currently checks settings flags only.
  Assert an actual semantic presentation contract or component output; do not
  claim that settings flags prove rendered labels.

Extract small production application actions or pure readiness functions only
where they provide real ownership and let both the live hook and acceptance
steps exercise the same behaviour. Do not add test-only production APIs,
duplicated acceptance state machines, no-op steps or Playwright inside Gherkin.
Use component/hook and browser coverage for React effects and tab events.

Retain scenarios as meaningful executable specifications; do not delete,
weaken, or mark them pending to obtain passing checks. Reuse the established
production-backed storage fixtures in `product-acceptance.steps.ts`. Tests must
inspect populated raw storage and retained state, including later edits and
reload. Regenerate `src/generated/acceptance-features.ts` after feature changes.

## 7. Close the directly related regression gaps

The reviewed scenario tests check a few settings and relative amounts but do
not provide the independent numerical comparison required by the original
prompt. Page tests do not exercise the worker lifecycle.

- Specify expected canonical settings independently for all eight variants.
  Compare the resulting cards against direct `calculateRetirementPlan` calls
  using those independent settings. Do not feed the builder's own output back
  into the engine as the sole expected result.
- Include at least one fixed numerical regression justified by existing
  production coverage, and cover post-statement Added Pension and reduction
  of regular payments through actual canonical rows. Do not copy old-calculator
  formulas or factor data into tests.
- Freeze date-dependent fixtures. Verify the inputs/base settings are not
  mutated, valid zero is distinct from unavailable, and combined pension uses
  the correct single dated row without employment income.
- Exercise the real controller with controlled Worker doubles: delayed and
  out-of-order replies, edits during calculation, invalid drafts, reset,
  external reset, unmount, worker failure and Retry. Assert user-visible state
  and that an obsolete batch cannot become current.
- Extend browser coverage for cross-tab reset/resurrection and a populated
  original modeller, not just its selected heading. Retain existing journeys'
  regression checks and accessible keyboard/error behaviour.

## 8. Verification and completion

Implement the smallest coherent repairs. Do not modify the canonical pension
formulas or published factor data. Update documentation only where these
repairs change or clarify observable behaviour. Keep shared field extensions
explicitly opt-in and test both caller modes.

During the implementation task, run focused tests as fixes are made, then the
applicable cumulative repository gates:

```bash
npm run generate:acceptance
npm run check
npm run test:e2e
npm run test:a11y
npm run test:smoke:prod
```

Regeneration is required when feature text changes. `npm run check` covers
formatting, lint, acceptance drift, typechecking, coverage tests, BDD and build.
Keep production smoke coverage because the feature introduces a separate
entry point and this repair touches shared privacy/input behaviour. Honour any
explicit no-test instruction given for the implementation task; if checks are
prohibited or blocked, report the omissions without claiming verification.
The user's no-automated-tests instruction for the preceding review was obeyed;
it is not evidence that this implementation has been verified.

Before finishing, audit every acceptance step's assertion against the actual
production code it exercises. Ensure no claimed privacy or financial outcome
is established only by test-world assignments, copied formulas or headings.

Report each of the six findings as resolved or still outstanding, the files and
observable behaviour changed, checks actually run and their results, and any
remaining limitations. Do not commit, publish or deploy unless requested.
