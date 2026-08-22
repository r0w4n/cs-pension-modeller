Feature: Target-based flexible-fund withdrawals
  Flexible retirement accounts can help meet the active income target without
  independently funding the same gap or changing existing drawdown instructions.

  Background:
    Given a target-based flexible withdrawal scenario

  Scenario: Offer the new strategy without removing existing strategies
    When the expert flexible-account withdrawal selectors are inspected
    Then each selector should offer "Use to meet income target"
    And each selector should retain the three existing withdrawal strategies

  Scenario: Use an ISA to meet a flat spending target
    Given the flat annual income target is 24000.00
    And an ISA with 50000.00 uses the target-based strategy
    When the flexible withdrawal projection is calculated
    Then annual ISA withdrawals at retirement should be 24000.00
    And annual net income at retirement should be 24000.00
    And avoidable flexible-fund surplus at retirement should be 0.00

  Scenario: Consume a phase-adjusted target from the target engine
    Given the annual income target is phase-adjusted from 24000.00 to 12000.00 at age 62
    And an ISA with 50000.00 uses the target-based strategy
    When the flexible withdrawal projection is calculated
    Then annual ISA withdrawals at age 61 should be 24000.00
    And annual ISA withdrawals at age 62 should be 12000.00

  Scenario: Coordinate multiple target-based accounts in priority order
    Given the annual income target is 12000.00
    And an ISA with 20000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    And ISA is before SIPP in the target-based priority
    When the flexible withdrawal projection is calculated
    Then annual ISA withdrawals at retirement should be 12000.00
    And annual SIPP withdrawals at retirement should be 0.00

  Scenario: Retain unused target-based funds as potential over-saving
    Given the annual income target is 12000.00
    And an ISA with 50000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    And a LISA with 20000.00 uses the target-based strategy from age 61
    And monthly SIPP contributions are 175.00
    And monthly LISA contributions are 225.00
    And ISA is before SIPP in the target-based priority
    When the flexible withdrawal projection is calculated
    Then annual SIPP withdrawals at retirement should be 0.00
    And annual LISA withdrawals at retirement should be 0.00
    And SIPP should be identified as potential over-saving
    And LISA should be identified as potential over-saving

  Scenario: Avoid a chart spike when target funding moves between accounts
    Given a target-based SIPP hands over to a LISA
    When the retirement income chart series is prepared
    Then flexible funding should not exceed the active income target during the handover

  Scenario: Configure priority in the expert retirement income target
    Given an ISA with 20000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    Then the funding priority should belong to the expert retirement income target section
    And the funding priority should not belong to simplified or bridge sections
    And the funding priority should not belong to an expert account withdrawal section

  Scenario: Reorder target-based accounts accessibly
    Given an ISA with 20000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    When ISA is moved to target-based priority 1
    Then ISA should be before SIPP in the target-based priority

  Scenario: Keep the funding controls visible for one account under phased spending
    Given Go-Go, Slow-Go, No-Go spending is enabled with only a SIPP included
    Then the funding priority should remain available
    And the target-based priority should be empty
    And the other-strategy accounts should include only SIPP

  Scenario: Move non-target strategies below the draggable priority
    Given an ISA with 20000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    When SIPP changes to the use-by-age strategy
    Then the funding priority should remain available
    And the target-based priority should include only ISA
    And the other-strategy accounts should include only SIPP

  Scenario: Keep the controls visible after the final target strategy changes
    Given an ISA with 20000.00 uses the target-based strategy
    And a SIPP with 20000.00 uses the target-based strategy
    When SIPP changes to the use-by-age strategy
    And ISA changes to the annual-percentage strategy
    Then the funding priority should remain available
    And the target-based priority should be empty
    And the other-strategy accounts should include SIPP and ISA

  Scenario: Keep flexible withdrawal controls out of non-expert journeys
    Then non-expert journey steps should not expose flexible withdrawal strategy controls
    And simplified journey settings should store legacy withdrawal strategies
    And bridge journey settings should store legacy withdrawal strategies

  Scenario: Skip an inaccessible account without changing its priority
    Given the annual income target is 12000.00
    And a LISA with 20000.00 uses the target-based strategy from age 62
    And an ISA with 20000.00 uses the target-based strategy
    And LISA is before ISA in the target-based priority
    When the flexible withdrawal projection is calculated
    Then annual LISA withdrawals at retirement should be 0.00
    And annual ISA withdrawals at retirement should be 12000.00
    And LISA should remain before ISA in the target-based priority

  Scenario: Gross up a taxable target-based withdrawal
    Given the annual income target is 12000.00
    And the income target is after estimated tax
    And Income Tax applies with no Personal Allowance
    And a SIPP with 50000.00 uses the target-based strategy
    When the flexible withdrawal projection is calculated
    Then annual net income at retirement should be 12000.00
    And gross annual SIPP withdrawals should be higher than 12000.00

  Scenario: Report avoidable surplus without changing an explicit strategy
    Given the flat annual income target is 24000.00
    And guaranteed annual net income is 20000.00
    And an ISA explicitly withdraws 12000.00 per year
    When the flexible withdrawal projection is calculated
    Then avoidable flexible-fund surplus at retirement should be 8000.00
    And the annual ISA withdrawal identified as reducible should be 8000.00
    And the ISA strategy should remain Annual percentage

  Scenario: Preview target-based withdrawals without changing the saved strategy
    Given the flat annual income target is 24000.00
    And guaranteed annual net income is 20000.00
    And an ISA explicitly withdraws 12000.00 per year
    When target-based ISA withdrawals are previewed
    Then the preview should reduce ISA withdrawals
    And the preview should reduce unallocated surplus
    And the ISA strategy should remain Annual percentage

  Scenario: Do not blame flexible funds for guaranteed-income surplus
    Given the flat annual income target is 24000.00
    And guaranteed annual net income is 27000.00
    When the flexible withdrawal projection is calculated
    Then unavoidable surplus at retirement should be 3000.00
    And avoidable flexible-fund surplus at retirement should be 0.00
    And no flexible withdrawal should be identified as reducible

  Scenario: Preserve and restore the opt-in strategy
    Given an ISA with 50000.00 uses the target-based strategy
    And SIPP is before ISA in the target-based priority
    When the flexible withdrawal settings are exported and parsed
    Then the restored ISA strategy should be target-based
    And SIPP should remain before ISA in the target-based priority

  Scenario: Bound the chart contribution drag controls
    When the retirement income chart limits are prepared
    Then the ISA and SIPP contribution drag controls should have a monthly maximum of 2000.00
