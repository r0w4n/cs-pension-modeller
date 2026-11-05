@civil-service-pension @legacy @classic @classic-plus @final-salary-link
Feature: Stop salary growth when linked legacy benefits are fixed
  A maintained final salary link can increase estimated classic and classic plus
  benefits before leaving linked service or drawing the legacy pension.
  Later salary rises must not increase those benefits once their salary is fixed.
  Configured pension increases remain a separate assumption.
  These examples use a member born on 1 June 1970, current final pensionable
  earnings of £70,000, and ten years of classic service. The classic plus examples
  instead use ten pre-2002 years and five post-2002 years.

  Scenario Outline: Salary rises do not continue after leaving or drawing
    Given a salary-linked "<scheme>" estimate with Alpha leaving age <leaveAge> and legacy draw age 60
    When the legacy plan is projected from 1 June 2026 with 3% pay rises and no inflation
    Then the legacy gross annual pension on "2030-06-01" should be <annualPension>
    And the legacy gross annual pension on "2040-06-01" should be <annualPension>

    Examples:
      | scheme       | leaveAge | annualPension |
      | classic      | 60       | 9848.20       |
      | classic plus | 60       | 16413.67      |
      | classic      | 58       | 9282.88       |
      | classic plus | 58       | 15471.46      |
      | classic      | 65       | 9848.20       |
      | classic plus | 65       | 16413.67      |
