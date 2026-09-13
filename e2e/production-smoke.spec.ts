import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __analyticsCommands?: AnalyticsCommand[];
    __recordAnalyticsCommand?: (command: AnalyticsCommand) => void;
    __recordAnalyticsStubLoad?: () => void;
    __analyticsStubLoadedCount?: number;
  }
}

type AnalyticsCommand = unknown[];

async function interceptAnalyticsRequests(
  page: import("@playwright/test").Page
) {
  const blockedRealAnalyticsUrls: string[] = [];
  const commands: AnalyticsCommand[] = [];
  const scriptUrls: string[] = [];
  let loadedCount = 0;

  await page.exposeFunction(
    "__recordAnalyticsCommand",
    (command: AnalyticsCommand) => {
      commands.push(command);
    }
  );
  await page.exposeFunction("__recordAnalyticsStubLoad", () => {
    loadedCount += 1;
  });

  await page.route(
    /https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com)\//,
    async (route) => {
      const url = route.request().url();

      if (
        url.startsWith("https://www.googletagmanager.com/gtag/js?id=G-TEST123")
      ) {
        scriptUrls.push(url);
        await route.fulfill({
          contentType: "application/javascript",
          body: `
            (() => {
              const recordCommand = (command) =>
                Array.prototype.slice.call(command);
              const commandLog = window.__analyticsCommands ?? [];
              window.__analyticsCommands = commandLog;
              window.__analyticsStubLoadedCount =
                (window.__analyticsStubLoadedCount ?? 0) + 1;
              window.__recordAnalyticsStubLoad?.();

              const forwardCommand = (command) => {
                const recordedCommand = recordCommand(command);
                commandLog.push(recordedCommand);
                window.__recordAnalyticsCommand?.(recordedCommand);
              };

              for (const command of window.dataLayer ?? []) {
                forwardCommand(command);
              }

              window.gtag = function gtag() {
                forwardCommand(arguments);
              };
            })();
          `,
        });
        return;
      }

      blockedRealAnalyticsUrls.push(url);
      await route.abort();
    }
  );

  return {
    blockedRealAnalyticsUrls,
    getState: () => ({ commands, loadedCount }),
    scriptUrls,
  };
}

function filterAnalyticsCommands(
  commands: AnalyticsCommand[],
  commandType: string,
  commandName?: string
) {
  return commands.filter(
    (command) =>
      command[0] === commandType &&
      (commandName === undefined || command[1] === commandName)
  );
}

function hasAnalyticsStorageCommand(
  commands: AnalyticsCommand[],
  commandType: "default" | "update",
  analyticsStorage: "granted" | "denied"
) {
  return commands.some((command) => {
    const parameters = command[2];

    return (
      command[0] === "consent" &&
      command[1] === commandType &&
      typeof parameters === "object" &&
      parameters !== null &&
      "analytics_storage" in parameters &&
      (parameters as Record<string, unknown>).analytics_storage ===
        analyticsStorage
    );
  });
}

async function pageHasAnalyticsDisabled(page: import("@playwright/test").Page) {
  return await page.evaluate(
    () =>
      window.gtag === undefined &&
      document.getElementById("google-analytics-script") === null
  );
}

async function navigateToJourneyResult(page: import("@playwright/test").Page) {
  for (let index = 0; index < 20; index += 1) {
    const resultHeading = page.getByRole("heading", {
      level: 3,
      name: "Your results",
    });

    if (await resultHeading.isVisible().catch(() => false)) {
      return;
    }

    await page
      .getByRole("button", {
        name: /^(Next|Show my answer|Calculate my plan)$/,
      })
      .click();
  }

  throw new Error("Result step was not reached");
}

test.describe("production build smoke checks", () => {
  test("serves the main app shell from the built artifact", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("dialog", { name: "Important information" })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();
  });

  test("serves footer pages from the built artifact", async ({ page }) => {
    await page.goto("/settings/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Settings" })
    ).toBeVisible();
    await expect(
      page.locator(".field-label", { hasText: "Export parameters" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export parameters" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clear all data" })
    ).toBeVisible();
    await expect(page.getByLabel("Choose JSON parameter file")).toBeVisible();
    await expect(page.getByLabel("Save inputs on this device")).toBeVisible();

    await page.goto("/methodology/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Methodology" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "What the model projects",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Important assumptions and omissions",
      })
    ).toBeVisible();

    const methodologyHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(methodologyHorizontalOverflow).toBeLessThanOrEqual(1);

    await page.goto("/acceptance/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Acceptance criteria" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "What this page shows",
      })
    ).toBeVisible();
    await expect(page.getByText("Alpha pension modelling")).toBeVisible();

    const acceptanceHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(acceptanceHorizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("gates analytics on direct navigation, consent changes and clearing data", async ({
    page,
  }) => {
    const { blockedRealAnalyticsUrls, getState, scriptUrls } =
      await interceptAnalyticsRequests(page);

    await page.goto("/privacy/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy" })
    ).toBeVisible();
    await expect
      .poll(() => getState())
      .toEqual({ commands: [], loadedCount: 0 });
    expect(scriptUrls).toHaveLength(0);
    expect(blockedRealAnalyticsUrls).toHaveLength(0);

    await page.goto("/");
    await page
      .getByRole("button", { name: "Continue without analytics" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeVisible();
    await page.goto("/methodology/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Methodology" })
    ).toBeVisible();
    await expect
      .poll(() => getState())
      .toEqual({ commands: [], loadedCount: 0 });
    expect(scriptUrls).toHaveLength(0);
    expect(blockedRealAnalyticsUrls).toHaveLength(0);

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/");
    await page
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
    await expect.poll(() => getState().loadedCount).toBe(1);
    const acceptedState = getState();
    expect(scriptUrls).toEqual([
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    ]);
    expect(
      hasAnalyticsStorageCommand(acceptedState.commands, "default", "granted")
    ).toBe(true);
    expect(
      filterAnalyticsCommands(acceptedState.commands, "event", "page_view")
    ).toHaveLength(1);
    expect(blockedRealAnalyticsUrls).toHaveLength(0);

    await page.goto("/settings/");
    await page.getByLabel("Allow analytics").uncheck();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("cs-pension-modeller.analyticsConsent")
        )
      )
      .toBe("false");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.gtag === undefined &&
            document.getElementById("google-analytics-script") === null
        )
      )
      .toBe(true);
    const withdrawnState = getState();
    expect(
      hasAnalyticsStorageCommand(withdrawnState.commands, "update", "denied")
    ).toBe(true);

    const eventCountAfterWithdrawal = filterAnalyticsCommands(
      withdrawnState.commands,
      "event"
    ).length;
    const scriptCountAfterWithdrawal = scriptUrls.length;
    await page.goto("/acceptance/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Acceptance criteria" })
    ).toBeVisible();
    const postWithdrawalInteractionState = getState();
    expect(
      filterAnalyticsCommands(postWithdrawalInteractionState.commands, "event")
    ).toHaveLength(eventCountAfterWithdrawal);
    expect(scriptUrls).toHaveLength(scriptCountAfterWithdrawal);
    expect(blockedRealAnalyticsUrls).toHaveLength(0);

    await page.goto("/settings/");
    const loadedCountBeforeClearingConsent = getState().loadedCount;
    await page.getByLabel("Allow analytics").check();
    await expect
      .poll(() => getState().loadedCount)
      .toBe(loadedCountBeforeClearingConsent + 1);
    await page.getByRole("button", { name: "Clear all data" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.gtag === undefined &&
            document.getElementById("google-analytics-script") === null
        )
      )
      .toBe(true);
    const clearedState = getState();
    expect(
      hasAnalyticsStorageCommand(clearedState.commands, "update", "denied")
    ).toBe(true);

    const eventCountAfterClearing = filterAnalyticsCommands(
      clearedState.commands,
      "event"
    ).length;
    const scriptCountAfterClearing = scriptUrls.length;
    await page.goto("/methodology/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Methodology" })
    ).toBeVisible();
    const postClearingInteractionState = getState();
    expect(
      filterAnalyticsCommands(postClearingInteractionState.commands, "event")
    ).toHaveLength(eventCountAfterClearing);
    expect(scriptUrls).toHaveLength(scriptCountAfterClearing);
    expect(blockedRealAnalyticsUrls).toHaveLength(0);
  });

  test("tracks consented support prompt analytics without support or payment details", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-09-12T12:00:00.000Z") });
    const { blockedRealAnalyticsUrls, getState } =
      await interceptAnalyticsRequests(page);

    await page.goto("/");
    await page
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
    await expect.poll(() => getState().loadedCount).toBe(1);

    await page
      .getByRole("button", { name: /Simplified retirement journey/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "A little about you" })
    ).toBeVisible();
    await navigateToJourneyResult(page);
    await expect(
      page.getByRole("heading", {
        name: "How your retirement income may change",
      })
    ).toBeVisible();

    await page.clock.fastForward(60_000);
    const supportDialog = page.getByRole("dialog", {
      name: "Found the modeller useful?",
    });
    await expect(supportDialog).toBeVisible();
    await expect
      .poll(
        () =>
          filterAnalyticsCommands(
            getState().commands,
            "event",
            "support_prompt_shown"
          ).length
      )
      .toBe(1);

    await supportDialog.getByRole("button", { name: "Maybe later" }).click();
    await expect(supportDialog).toBeHidden();
    await expect
      .poll(
        () =>
          filterAnalyticsCommands(
            getState().commands,
            "event",
            "support_prompt_maybe_later_selected"
          ).length
      )
      .toBe(1);

    const supportEvents = filterAnalyticsCommands(
      getState().commands,
      "event"
    ).filter(
      (command) =>
        typeof command[1] === "string" && command[1].startsWith("support_")
    );

    for (const command of supportEvents) {
      expect(command).not.toContain("https://buy.stripe.com");
      expect(command).not.toContain("bJe00j5KM0tB1qd919fYY01");
      expect(command).not.toContain("pk_live");
      expect(command).not.toContain("£");
      expect(command).not.toContain(5);
    }
    expect(blockedRealAnalyticsUrls).toHaveLength(0);
  });

  test("syncs analytics withdrawal and data clearing across open app and static tabs", async ({
    context,
  }) => {
    const appPage = await context.newPage();
    const staticPage = await context.newPage();
    const appAnalytics = await interceptAnalyticsRequests(appPage);
    const staticAnalytics = await interceptAnalyticsRequests(staticPage);

    await appPage.goto("/");
    await appPage
      .getByRole("button", { name: "Accept analytics and continue" })
      .click();
    await expect.poll(() => appAnalytics.getState().loadedCount).toBe(1);

    await staticPage.goto("/privacy/");
    await expect(
      staticPage.getByRole("heading", { level: 1, name: "Privacy" })
    ).toBeVisible();
    await expect.poll(() => staticAnalytics.getState().loadedCount).toBe(1);

    await appPage.goto("/settings/");
    await appPage.getByLabel("Allow analytics").uncheck();
    await expect.poll(() => pageHasAnalyticsDisabled(appPage)).toBe(true);
    await expect.poll(() => pageHasAnalyticsDisabled(staticPage)).toBe(true);
    expect(
      hasAnalyticsStorageCommand(
        staticAnalytics.getState().commands,
        "update",
        "denied"
      )
    ).toBe(true);

    await appPage.getByLabel("Allow analytics").check();
    await expect.poll(() => appAnalytics.getState().loadedCount).toBe(2);
    await expect.poll(() => staticAnalytics.getState().loadedCount).toBe(2);

    await appPage.getByRole("button", { name: "Clear all data" }).click();
    await expect.poll(() => pageHasAnalyticsDisabled(appPage)).toBe(true);
    await expect.poll(() => pageHasAnalyticsDisabled(staticPage)).toBe(true);
    await expect
      .poll(() =>
        appPage.evaluate(() =>
          window.localStorage.getItem("cs-pension-modeller.localStorageEnabled")
        )
      )
      .toBe("false");
    expect(
      hasAnalyticsStorageCommand(
        staticAnalytics.getState().commands,
        "update",
        "denied"
      )
    ).toBe(true);
    expect(appAnalytics.blockedRealAnalyticsUrls).toHaveLength(0);
    expect(staticAnalytics.blockedRealAnalyticsUrls).toHaveLength(0);
  });
});
