@income-tax
Feature: Retirement income tax modelling

  The modeller should show tax as an estimate based on the selected tax
  assumptions, while keeping pension income sources transparent.

  Background:
    Given Income Tax outputs are rounded to 2 decimal places

  @optional
  Scenario: Do not deduct Income Tax when taxation is disabled
    Given Income Tax modelling is off
    And monthly Alpha pension income is 3000.00
    And monthly State Pension income is 1000.00
    And monthly SIPP income is 500.00
    When monthly Income Tax is calculated
    Then the monthly Income Tax should be 0.00

  @standard-assumptions
  Scenario Outline: Estimate annual Income Tax for England, Wales or Northern Ireland
    Given Income Tax modelling is on
    And the Income Tax regime is England, Wales or Northern Ireland
    When annual taxable retirement income of <annualTaxableIncome> is taxed
    Then the annual Income Tax should be <expectedAnnualTax>

    Examples:
      | annualTaxableIncome | expectedAnnualTax |
      | 50000.00            | 7486.00           |
      | 125140.00           | 42516.00          |
      | 130000.00           | 44703.00          |

  @scotland @standard-assumptions
  Scenario Outline: Estimate annual Scottish Income Tax across each 2026/27 band
    Given Income Tax modelling is on
    And the Income Tax regime is Scotland
    When annual taxable retirement income of <annualTaxableIncome> is taxed
    Then the annual Income Tax should be <expectedAnnualTax>

    Examples:
      | annualTaxableIncome | expectedAnnualTax |
      | 12570.00            | 0.00              |
      | 16537.00            | 753.73            |
      | 29526.00            | 3351.53           |
      | 43662.00            | 6320.09           |
      | 75000.00            | 19482.05          |
      | 110000.00           | 37482.05          |
      | 125140.00           | 47701.55          |
      | 130000.00           | 50034.35          |

  @sipp
  Scenario: Keep the tax-free SIPP share outside taxable income
    Given Income Tax modelling is on
    And the SIPP tax-free withdrawal share is 25.00%
    And monthly Alpha pension income is 2000.00
    And monthly State Pension income is 1000.00
    And monthly SIPP income is 1000.00
    When monthly Income Tax is calculated
    Then the monthly Income Tax should be 540.50

  @scotland @sipp
  Scenario: Apply Scottish bands after excluding the tax-free SIPP share
    Given Income Tax modelling is on
    And the Income Tax regime is Scotland
    And the SIPP tax-free withdrawal share is 25.00%
    And monthly Alpha pension income is 2000.00
    And monthly State Pension income is 1000.00
    And monthly SIPP income is 1000.00
    When monthly Income Tax is calculated
    Then the monthly Income Tax should be 573.50

  @legacy-pension
  Scenario: Include nuvos pension in taxable retirement income
    Given Income Tax modelling is on
    And the personal allowance is 0.00
    And the basic rate band is 50000.00
    And monthly Alpha pension income is 100.00
    And monthly nuvos pension income is 50.00
    When monthly Income Tax is calculated
    Then the monthly Income Tax should be 30.00
