# Civil Service Pension Calculator

A small React and TypeScript app for exploring a projected Civil Service Alpha pension over time.

The calculator models:

- current accrued Alpha pension from the latest Annual Benefit Statement
- ongoing Alpha accrual from pensionable earnings
- Alpha pension draw date and early-retirement reduction
- State Pension start date derived from date of birth, plus annual amount
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
- total monthly pension income

## Main Inputs

The current version is driven by these inputs:

- `Calculation Start Date`
- `Date of Birth`
- `Life Expectancy`
- `Normal Pension Age`
- `State Pension amount`
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
- State Pension is treated as a flat annual amount. Its start date is derived from date of birth using the current GOV.UK State Pension age timetable.

## Project Structure

- [src/App.tsx](/Users/rowan/Documents/github/cs-pension-calculator/src/App.tsx) contains the main UI and projection table.
- [src/settings.ts](/Users/rowan/Documents/github/cs-pension-calculator/src/settings.ts) defines defaults, normalization, validation, and persistence.
- [src/projection.ts](/Users/rowan/Documents/github/cs-pension-calculator/src/projection.ts) contains the projection and pension calculation logic.
- [src/data/alpha_pension_added_pension_factors.json](/Users/rowan/Documents/github/cs-pension-calculator/src/data/alpha_pension_added_pension_factors.json) stores age-based added pension purchase factors.
- [src/data/alpha_pension_reduction_factors.json](/Users/rowan/Documents/github/cs-pension-calculator/src/data/alpha_pension_reduction_factors.json) stores early-retirement reduction factors.

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

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Current Limitations

This is still a planning tool rather than a scheme-authoritative calculator.

A few notable limitations:

- tax is not modelled
- inflation is not modelled
- State Pension is treated as a simple fixed annual amount
- revaluation for added pension purchases is currently simplified
- scheme-specific edge cases are not exhaustively represented

## Purpose

The goal of the project is to make pension timing decisions easier to reason about by turning a set of assumptions into something visual, editable, and testable.
