# AGENTS.md

## Project Purpose And Non-Negotiable Safety Rules

This repository contains a static web application for modelling UK Civil
Service pension and retirement-income scenarios. Consult `README.md` for the
current supported schemes, features, assumptions, and limitations.

The application is for planning and illustration only. It is not financial
advice and must not imply affiliation with the Civil Service Pension Scheme,
Capita, the Cabinet Office, or any individual pension scheme.

Non-negotiable priorities, in order:

1. Preserve pension and tax modelling correctness.
2. Expose material assumptions, uncertainty, and limitations.
3. Use qualified language; never present modelled outputs as guaranteed.
4. Protect locally stored financial and personal information.
5. Preserve accessibility, keyboard use, and mobile usability.
6. Keep the application maintainable, testable, and compatible with static
   hosting.

Treat financial calculation changes as high risk. Do not silently alter model
meaning, hide assumptions, weaken tests, send user data externally, or imply
that the modeller is official.

## Sources Of Truth And Architecture Map

Use the existing project tooling. Resolve current facts in this order:

- `README.md`: canonical project overview, supported capabilities,
  architecture, and modelling assumptions
- `package.json`: commands, dependencies, and supported Node versions
- `features/`: executable business specifications and acceptance examples
- `src/pages/methodology.tsx`: public methodology and limitations
- `.github/workflows/`: CI, security, audit, and deployment behaviour

If this file conflicts with the README about current capabilities,
architecture, or assumptions, follow the README and correct the inconsistency.
Do not duplicate full feature or scheme inventories here.

This map is for orientation; the README architecture section is canonical:

| FCIS layer / area                     | Responsibility                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `src/main.tsx`, `src/App.tsx`, UI     | Presentation and top-level composition                                  |
| `src/app/`                            | Imperative shell: application state, orchestration, effects and caches  |
| `src/settings/`                       | Canonical settings, validation, normalization and schema migration      |
| `src/projection-core.ts`, `src/row-*` | Pure projection pipeline and row generation                             |
| `src/projection-domains/`             | Pure pension, savings, tax, inflation and bridge calculations           |
| `src/calculation/`                    | Canonical `RetirementPlanResult` calculation and assessment             |
| `src/result-projection/`              | Pure projection, including chart contracts, series and layout data      |
| `src/app-domains/`                    | Stateless journey, form, chart and comparison adapters                  |
| `src/app/retirement-income-chart-*`   | Shared chart presentation adapters, controls and accessible equivalents |
| `src/data/`                           | Pension factor tables and source metadata                               |
| `features/`                           | Gherkin specifications and step definitions                             |
| `e2e/`                                | Browser journeys, accessibility and production smoke tests              |

### FCIS Architecture Rules

The required flow is `Presentation -> Application State -> Domain / Calculation
Engine -> Result Projection -> Presentation`.

- Keep React state, hooks, browser APIs, persistence, analytics, generated IDs,
  mutable caches, and other effects in `src/app/` or browser entry points.
- Keep calculation and result-projection functions deterministic. Pass inputs
  explicitly; do not read local storage, the DOM, the current time, randomness,
  or mutable application state from the functional core.
- Use `calculateRetirementPlan` as the canonical active-plan calculation entry
  point. Extend `RetirementPlanResult` deliberately when downstream projections
  need more domain data; do not recalculate pension rows in a component.
- Project canonical results into semantic values before rendering. Result
  projections must not return JSX or `ReactNode` values.
- Treat journeys as presentation configurations only. A journey may choose
  shared fields, copy, ordering, defaults, and visible result components, but it
  must not have a distinct pension or withdrawal calculation path.
- Keep bridge analysis in the canonical `RetirementPlanResult`. Result and
  comparison projections consume that shared diagnostic; they must not start a
  separate bridge projection or treat it as a journey-specific engine.
- Dependency direction must follow the required flow. Presentation may call
  application actions; the imperative shell may call the functional core; the
  core must not import presentation or application-state modules.

## Change Workflow

Before editing:

1. Read the relevant README or methodology sections.
2. Inspect the affected production code and existing tests.
3. Review relevant Gherkin scenarios when pension behaviour, validation,
   user-visible workflows, or documented outcomes may change.
4. Search for existing components, styles, utilities, and patterns before
   creating new ones.
5. Identify material assumptions, edge cases, persistence implications, and
   the smallest coherent change.

While editing:

- preserve existing architecture and conventions unless the task requires a
  deliberate departure
- avoid unrelated refactors, premature abstraction, and duplicated logic
- preserve TypeScript type safety and avoid unnecessary `any`
- use descriptive names and named constants for material financial values
- document non-obvious financial decisions, not obvious code
- update tests, Gherkin, public documentation, and schema history when their
  documented behaviour changes

An explicit user request for a redesign, migration, dependency, or broader
change provides approval within that stated scope. Ask before expanding beyond
it in a way that materially changes behaviour, architecture, privacy, or
maintenance cost.

## Financial-Model And Source-Provenance Rules

For changes to pension calculations, tax, inflation, factors, thresholds,
dates, or projection behaviour:

- read the production implementation and tests first
- add or update regression tests for each behavioural change
- avoid hidden assumptions and rounding before the final required stage
- distinguish missing, unavailable, zero, defaulted, and user-entered values
- keep equivalent rounding and formatting consistent throughout the application
- make material assumptions and limitations visible to users
- preserve backwards compatibility in settings normalization and migration
  where practical

Do not silently correct a calculation. Explain the defect, make the changed
behaviour explicit, and capture it in tests and relevant documentation.

Do not infer or invent scheme rules. When changing rules or factor data:

- prefer authoritative primary sources
- record the publication or workbook version, table, effective date, and URL
- preserve source metadata alongside imported factor data
- use published values directly where supported
- do not extrapolate to unsupported cases without explicit agreement and clear
  disclosure
- report uncertainty or conflicting sources rather than choosing silently

## Behaviour-Specification And Testing Matrix

Treat relevant Gherkin features as primary specifications of pension behaviour
and key user outcomes. Keep scenarios understandable to non-developers and
focused on observable business rules.

When behaviour changes, update or add scenarios in the same change. Do not
weaken, delete, bypass, or retag a scenario as `@pending` merely to make tests
pass. Use `@pending` only for explicit future or under-review behaviour.

Step definitions must call production domain, projection, settings, or
app-domain APIs. Do not create acceptance-only shadow implementations, use
non-pending no-op steps for user-visible behaviour, or drive Playwright through
Gherkin steps.

Use the smallest relevant checks during development and meet these minimums
before reporting completion:

| Change                                                       | Specification and minimum verification                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Documentation only                                           | Review affected documentation; run `npm run format:check`                                                                                        |
| TypeScript source or test                                    | Update Vitest/Testing Library coverage as relevant; run `npm run format:check`, `npm run lint:hook`, `npm run typecheck:all`, and `npm run test` |
| Pension or user-visible behaviour                            | Update relevant Gherkin and unit coverage; run TypeScript checks plus `npm run test:bdd`                                                         |
| Journey, form, navigation, layout, storage, or accessibility | Update relevant component/Gherkin coverage and run source checks plus the smallest relevant Playwright suite                                     |
| Broad or release-sensitive change                            | Run `npm run check` or, when appropriate, `npm run check:full`                                                                                   |

Vitest and Testing Library cover domain, adapter, unit, and component behaviour.
Cucumber/Gherkin covers fast business rules and pension acceptance examples.
Playwright covers browser journeys, routing, layout, storage, accessibility, and
production smoke behaviour.

Available commands are defined in `package.json`. Playwright checks start local
servers and may require port access; audit commands require registry access.
Fix failures caused by the change. If a check cannot run or fails for an
unrelated reason, report the command, result, and impact. Never bypass a failing
test without explanation.

## Privacy, Accessibility, And User-Facing Copy Essentials

Inputs and preferences currently persist in `window.localStorage`. Treat them
as sensitive:

- make clear what is saved and preserve reset or clear controls
- respect any “do not save” setting
- avoid storing unnecessary personal information
- do not add analytics, tracking, external storage, server endpoints, or
  submission of financial data without explicit instruction
- do not introduce hard-coded secrets, unsafe HTML, or unnecessary external
  scripts

Write in calm, clear UK English for people without specialist pension
knowledge. Explain unavoidable jargon at the point of use and keep terminology
stable. State whether amounts are monthly or annual, real or nominal, and before
or after estimated tax.

Avoid claims such as “you will receive”, “guaranteed”, “best option”, or “you
should retire at”. Prefer wording such as “the model estimates”, “based on the
assumptions entered”, and “check against your official pension statement”.
Where appropriate, direct users to regulated financial advice for important
decisions.

Do not expose stack traces or internal implementation details in the UI. If
`dangerouslySetInnerHTML` is unavoidable, justify it and use only trusted or
properly sanitised content.

For interface changes:

- reuse established components, tokens, language, and interaction patterns
- prefer semantic HTML and native controls
- preserve accessible names, visible focus, logical keyboard order, and
  appropriate focus movement
- do not rely on colour, hover, drag, placeholders, or tooltips alone
- provide text or tabular equivalents for important chart information
- preserve meaning, content priority, and actions at narrow viewports
- allow browser zoom, text enlargement, realistic wrapping, and validation
  messages
- preserve entered values when validation fails and distinguish missing values
  from zero

Consult the detailed design guidance before material UI work. A materially
different visual language or novel interaction requires agreement unless the
user already requested it.

## Dependency And Scope Restrictions

Do not add a framework, package, state-management library, styling system, test
framework, build tool, component library, server dependency, analytics, or
tracking unless explicitly requested.

You may recommend a dependency when it materially improves correctness,
accessibility, security, maintainability, performance, or developer experience.
Explain why existing code is insufficient, the alternatives, maintenance and
security risk, bundle or runtime impact, and migration cost.

Avoid dependencies for trivial utilities and do not upgrade major versions
casually. `npm audit fix` may change the dependency graph; run it only for an
explicit dependency or security-remediation task, review manifest and lockfile
changes, and never use `--force` without explicit approval.

Do not make large unrelated refactors, replace the architecture unnecessarily,
or create noisy CI checks without clear value.

For CI changes, use `npm ci`, preserve least-privilege permissions, and do not
mask meaningful failures with `continue-on-error` without explicit
justification.

## Concise Completion Checklist

Before reporting completion, confirm that:

- the requested outcome is implemented without unrelated scope
- financial meaning, assumptions, privacy, accessibility, and mobile behaviour
  remain correct
- relevant tests, Gherkin scenarios, documentation, and schema history are
  updated
- the minimum verification matrix has been satisfied, or omissions are clearly
  explained

In the final response, concisely state:

- the outcome, reason, and files changed
- the Gherkin or observable-behaviour impact
- checks run, failures, and important omissions
- remaining risks or follow-up work

## Detailed Design, Methodology, And Testing Documentation

- [Project overview and architecture](README.md#architecture)
- [Modelling assumptions](README.md#important-assumptions)
- [Public methodology implementation](src/pages/methodology.tsx)
- [Detailed interface and design guidance](docs/design-guidelines.md)
- [Development and testing](README.md#development)
- [Testing strategy and commands](README.md#testing)
- [Executable behaviour specifications](features/)
- [Browser and accessibility tests](e2e/)
