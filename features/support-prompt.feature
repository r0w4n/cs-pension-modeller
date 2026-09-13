@support-prompt
Feature: Voluntary support prompt

  The modeller may invite voluntary support after useful results are available,
  but the modeller remains free and does not infer payment from opening Stripe.

  Scenario Outline: Support prompt eligibility uses completed visible Results only
    Given the support prompt has no stored preference
    When support prompt eligibility is checked for step "<step>" with calculation "<calculation>" and document "<visibility>"
    Then the support prompt should be "<eligibility>"

    Examples:
      | step    | calculation  | visibility | eligibility  |
      | inputs  | complete     | visible    | ineligible   |
      | results | pending      | visible    | ineligible   |
      | results | unavailable  | visible    | ineligible   |
      | results | failed       | visible    | ineligible   |
      | results | complete     | hidden     | ineligible   |
      | results | complete     | visible    | eligible     |

  Scenario: The support prompt requires continuous eligible time
    Given the support prompt has no stored preference
    When the support prompt becomes eligible
    And 30 support prompt seconds pass
    And the support prompt becomes ineligible
    And 60 support prompt seconds pass
    Then the support prompt delay should not be complete
    When the support prompt becomes eligible
    And 60 support prompt seconds pass
    Then the support prompt delay should be complete

  Scenario: Local support actions persist the intended hide period
    Given support prompt local storage is available
    When the support prompt action "Buy me a coffee" is saved
    Then the stored support prompt preference should be "snoozed" for "1 week"
    When the support prompt action "Maybe later" is saved
    Then the stored support prompt preference should be "snoozed" for "1 week"
    When the support prompt action "I've already bought you a coffee" is saved
    Then the stored support prompt preference should be "supported" for "6 months"
    When the support prompt action "No thanks - don't ask again" is saved
    Then the stored support prompt preference should be "declined" for "1 month"

  Scenario Outline: Stored support prompt values fail safely
    Given support prompt local storage contains "<storedValue>"
    When the stored support prompt preference is loaded
    Then no stored support prompt preference should load

    Examples:
      | storedValue         |
      | malformed json      |
      | snoozed without date |
      | supported without date |
      | declined without date |
      | unknown status      |

  Scenario: Local saving opt-out and clear data remove the support preference
    Given support prompt local storage is available
    When the support prompt action "No thanks - don't ask again" is saved
    And support prompt local saving is disabled
    Then no stored support prompt preference should load
    When the support prompt action "I've already bought you a coffee" is saved
    Then no raw support prompt preference should be stored
    When support prompt local storage is available
    And the support prompt action "Maybe later" is saved
    And stored support prompt data is cleared
    Then no stored support prompt preference should load

  Scenario: Support prompt analytics events stay coarse
    Then support prompt analytics should define these events:
      | event                                      |
      | support_prompt_shown                       |
      | support_payment_link_selected              |
      | support_prompt_maybe_later_selected        |
      | support_prior_support_selected             |
      | support_prompt_decline_selected            |
      | support_prompt_dismissed                   |
      | support_payment_returned                   |
    Then support prompt analytics events should not contain financial or Stripe configuration values
