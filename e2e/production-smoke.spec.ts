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
});
