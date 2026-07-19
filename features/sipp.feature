@sipp
Feature: SIPP access age modelling

  The modeller should apply standard private pension access ages and allow
  provider-confirmed protected pension age assumptions without treating them as
  legal determinations.

  Scenario: Apply the standard SIPP access age using the planned draw date
    Given a SIPP modelling scenario for someone born on "1972-08-01"
    And provider-confirmed SIPP protected pension age is off
    When the SIPP draw start age is 55
    Then SIPP draw start age validation should pass
    And the SIPP projection should start withdrawals at age 55
    When the SIPP draw start age is 56
    Then the SIPP draw start age validation message should be "SIPP draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age."
    When the SIPP draw start age is 57
    Then SIPP draw start age validation should pass

  Scenario: Use a provider-confirmed protected SIPP access age
    Given a SIPP modelling scenario for someone born on "1980-08-01"
    And provider-confirmed SIPP protected access is on
    When the SIPP draw start age is 50
    Then SIPP draw start age validation should pass
    And the SIPP projection should start withdrawals at age 50
    When the SIPP draw start age is 49
    Then the SIPP draw start age validation message should be "SIPP draw start age must not be earlier than the provider-confirmed protected SIPP access age of 50."

  Scenario: Ignore stored protected age while provider confirmation is off
    Given a SIPP modelling scenario for someone born on "1973-04-06"
    And stored SIPP protected pension age is 55 while provider confirmation is off
    When the SIPP draw start age is 55
    Then the SIPP draw start age validation message should be "SIPP draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age."
    And the protected pension age standalone form field should be hidden
    And the SIPP draw start age field minimum should be 57

  Scenario: Persist provider-confirmed protected SIPP access age settings
    Given a SIPP modelling scenario for someone born on "1980-08-01"
    And provider-confirmed SIPP protected access is on
    When the SIPP settings are saved and loaded
    Then the loaded SIPP settings should have provider-confirmed protected pension age on

  Scenario: Expose protected SIPP controls in SIPP journeys
    Given a SIPP modelling scenario for someone born on "1980-08-01"
    And provider-confirmed SIPP protected access is on
    Then the SIPP draw start age section should contain protected SIPP controls
    And every journey that exposes SIPP draw start age should keep protected SIPP controls after it
