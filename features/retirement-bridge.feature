@retirement-bridge
Feature: Early retirement bridge planning

  The modeller should help users see whether flexible savings and secure income
  can cover the period between stopping work and later pension income.

  Background:
    Given bridge analysis outputs are rounded to 2 decimal places

  @retirement-age
  Scenario: Move an aligned Alpha draw age with a later retirement age
    Given the bridge retirement age is 57
    And the bridge Alpha draw age is 57
    When the bridge target retirement age is changed to 60
    Then the bridge retirement age should be 60
    And the bridge Alpha draw age should be 60

  @no-civil-service-pension
  Scenario: Model a bridge plan without Civil Service pension income
    Given the bridge plan has no Civil Service pension
    And the bridge plan has no State Pension
    And the bridge plan has an ISA balance of 10000.00
    And the bridge retirement age is 60
    And the bridge life expectancy age is 61
    And the bridge target income is 6000.00 per year
    When the bridge plan is analysed
    Then the bridge plan should work on these assumptions
    And the retirement income summary should not include Alpha pension
    And the first bridge phase should show no secure income source

  @state-pension
  Scenario: Show State Pension changing the bridge income sources
    Given the bridge plan has no Civil Service pension
    And the bridge plan includes State Pension of 12000.00 per year from 2026-05-06
    And the bridge plan has an ISA balance of 30000.00
    And the bridge plan has a SIPP balance of 30000.00
    And the bridge retirement age is 66
    And the bridge life expectancy age is 68
    And the bridge target income is 12000.00 per year
    When the bridge plan is analysed
    Then the bridge plan should work on these assumptions
    And at least one bridge phase should include "State Pension"
    And the stable annual secure income should be 12000.00

  @additional-guaranteed-income
  Scenario: Use additional guaranteed income to reduce the bridge funding need
    Given the bridge plan has no Civil Service pension
    And the bridge plan has no State Pension
    And the bridge retirement age is 58
    And the bridge life expectancy age is 62
    And the bridge target income is 18000.00 per year
    And the bridge plan has an ISA balance of 30000.00
    When the bridge plan is analysed
    And the same bridge plan adds guaranteed income of 6000.00 per year from age 60
    Then the total bridge funding need should be lower with the guaranteed income
