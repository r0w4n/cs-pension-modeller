# Civil Service Pension Modeller

A small React and TypeScript app for exploring a projected Civil Service Alpha pension over time.

The modeller models:

- current accrued Alpha pension from the latest Annual Benefit Statement
- ongoing Alpha accrual from pensionable earnings
- Alpha pension draw date and early-retirement reduction
- State Pension draw date derived from date of birth, with optional deferral
  and future uprating
- monthly added pension contributions
- one-off or yearly lump-sum added pension purchases

It presents the result as both a summary and a month-by-month projection table, with milestone rows highlighted for key pension events.

## What The App Does

The app takes a set of pension assumptions and builds a monthly projection from the chosen calculation start date through the selected life expectancy date.

For each row it calculates:

- age in years and months
- monthly added pension bought from the regular monthly contribution
- any lump-sum added pension bought in that month
- annual accrued Alpha pension
- annual Alpha pension after any early-retirement reduction
- monthly Alpha pension once drawdown starts
- monthly State Pension once it starts
- State Pension deferral uplift and future uprating where enabled
- total monthly pension income

## Main Inputs

The current version is driven by these inputs:

- `Calculation Start Date`
- `Date of Birth`
- `Life Expectancy`
- `Normal Pension Age`
- `State Pension amount`
- `State Pension draw date`
- optional State Pension future growth assumptions
- `Alpha ABS year`
- `Accrued Alpha pension at last ABS`
- `Monthly added pension contribution`
- `Age leaving Alpha pensionable service`
- `Pensionable earnings`
- `Alpha pension draw age`
- optional lump-sum added pension schedules

Lump-sum added pension entries can be:

- `one-off`
- `yearly`

Each lump sum has an amount and purchase date, and yearly entries can repeat until an end date.

## Calculation Notes

Some important current assumptions in the projection logic:

- Alpha accrual is calculated monthly using a `2.32%` annual accrual rate.
- The starting accrued Alpha pension is rolled forward from the ABS date to the chosen calculation start date.
- Accrual stops at the earlier of:
  `Alpha pension draw age` or `Age leaving Alpha pensionable service`.
- Lump-sum added pension is converted into extra annual pension using the age-based factor table in `src/data/alpha_pension_added_pension_factors.json`.
- Lump-sum purchases appear once in the row where they land, then remain embedded in annual accrued pension from that point onward.
- Early-retirement reduction is applied using the factor table in `src/data/alpha_pension_reduction_factors.json`.
- State Pension draw date defaults from date of birth using the current GOV.UK State Pension age timetable, but can be deferred.
- Deferred new State Pension uses the GOV.UK rule of 1% extra for every 9 weeks deferred, once deferred by at least 9 weeks.
- When State Pension future growth is enabled, the base State Pension is uprated using the highest of CPI, wage growth, and 2.5%; deferred extra State Pension is uprated by CPI after draw.

## Project Structure

- [src/App.tsx](src/App.tsx) contains the main UI and projection table.
- [src/settings.ts](src/settings.ts) defines defaults, normalization, validation, and persistence.
- [src/projection.ts](src/projection.ts) contains the projection and pension calculation logic.
- [src/data/alpha_pension_added_pension_factors.json](src/data/alpha_pension_added_pension_factors.json) stores age-based added pension purchase factors.
- [src/data/alpha_pension_reduction_factors.json](src/data/alpha_pension_reduction_factors.json) stores early-retirement reduction factors.

Tests are colocated with the code in `src/*.test.ts` and `src/*.test.tsx`.

## Development

Requirements:

- Node `20.19.0` or newer

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Testing

Run the test suite:

```bash
npm run test
```

Run the full local quality gate:

```bash
npm run check
```

Static analysis is performed with type-aware `eslint` backed by
`typescript-eslint` and `eslint-plugin-sonarjs`, so `npm run lint` checks for
TypeScript misuse and common bug patterns in addition to normal lint rules.

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Purpose

The goal of the project is to make pension timing decisions easier to reason about by turning a set of assumptions into something visual, editable, and testable.
