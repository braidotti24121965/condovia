import { expect, loginE2EAccount, test } from "./fixtures";
import type { Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
] as const;

const screens = [
  ["dashboard", "/app/dashboard"], ["imports", "/app/condominium/imports"],
  ["units", "/app/condominium/units"], ["owners", "/app/condominium/owners"],
  ["condominium", "/app/condominium"], ["structures", "/app/condominium/structures"],
  ["people", "/app/condominium/people"], ["residents", "/app/condominium/residents"],
  ["reservations", "/app/reservations"], ["resources", "/app/reservations/resources"],
  ["gatehouse", "/app/gatehouse"], ["access", "/app/gatehouse/access"],
  ["authorizations", "/app/gatehouse/authorizations"], ["packages", "/app/gatehouse/packages"],
  ["visitors", "/app/gatehouse/visitors"], ["providers", "/app/gatehouse/providers"],
  ["history", "/app/gatehouse/history"], ["access-points", "/app/gatehouse/access-points"],
  ["occurrences", "/app/occurrences"], ["profile", "/app/profile"], ["my-units", "/app/my-units"],
] as const;

async function stablePage(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  await page.locator("body").waitFor({ state: "visible" });
  await expect(page.locator(".loading-page")).toHaveCount(0, { timeout: 15_000 });
  if (path === "/app/dashboard") {
    await page.locator(".dashboard-v2").waitFor({ state: "visible", timeout: 15_000 });
  }
  await page.evaluate(() => document.fonts?.ready);
}

test.describe.serial("Pacote 7 — regressão visual Professional Compact V2", () => {
  test.setTimeout(60_000);
  for (const viewport of viewports) for (const [id, path] of screens) {
    test(`${id} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginE2EAccount(page, "resident");
      await stablePage(page, path);
      await expect(page).toHaveScreenshot(`${id}-${viewport.width}x${viewport.height}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: true,
        scale: "css",
        maxDiffPixels: 0,
      });
    });
  }
});
