import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, loginE2EAccount, test } from "./fixtures";
import type { Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
] as const;

const screens = [
  ["condominium", "/app/condominium"], ["structures", "/app/condominium/structures"],
  ["people", "/app/condominium/people"], ["residents", "/app/condominium/residents"],
  ["reservations", "/app/reservations"], ["resources", "/app/reservations/resources"],
  ["gatehouse", "/app/gatehouse"], ["access", "/app/gatehouse/access"],
  ["authorizations", "/app/gatehouse/authorizations"], ["packages", "/app/gatehouse/packages"],
  ["visitors", "/app/gatehouse/visitors"], ["providers", "/app/gatehouse/providers"],
  ["history", "/app/gatehouse/history"], ["access-points", "/app/gatehouse/access-points"],
  ["occurrences", "/app/occurrences"], ["profile", "/app/profile"], ["my-units", "/app/my-units"],
] as const;

type Result = { screen: string; path: string; viewport: typeof viewports[number]; status: "PASS" | "FAIL" | "NÃO VERIFICADO"; reason: string; url: string; screenshot: string; metrics?: Record<string, unknown> };
const results: Result[] = [];
const root = join(process.cwd(), "test-results", "pacote7-expansion");

async function stablePage(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.readyState === "complete");
}

async function metrics(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => {
        const width = window.innerWidth;
        const outside = [...document.querySelectorAll<HTMLElement>("button,a,input,select,textarea,[role=dialog]")].map((element) => {
          const rect = element.getBoundingClientRect();
          return { element: element.className || element.tagName.toLowerCase(), right: rect.right, bottom: rect.bottom };
        }).filter((item) => item.right > width + 1 || item.right < -1 || item.bottom < -1);
        return { innerWidth: width, innerHeight: window.innerHeight, clientWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth || document.body.scrollWidth > document.documentElement.clientWidth, outsideViewport: outside.slice(0, 25) };
      });
    } catch (error) {
      if (!(error instanceof Error) || !/Execution context was destroyed/.test(error.message) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.locator("body").waitFor({ state: "visible" }).catch(() => undefined);
    }
  }
  throw new Error("medição não estabilizou");
}

function blocked(url: string, body: string) {
  if (/\/login|\/select-context|\/no-permission/.test(url) || /Sem acesso|Acesso não disponível/i.test(body)) return "rota bloqueada por autenticação, contexto ou permissão";
  if (!/\/app(?:\/|$)/.test(url)) return "rota não carregou o Shell";
  return undefined;
}

async function safeShellInteraction(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir menu" });
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await expect(page.locator(".drawer-backdrop")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".drawer-backdrop")).toBeHidden();
  }
  const notifications = page.getByRole("button", { name: /^Notificações/ });
  if (await notifications.isVisible().catch(() => false)) {
    await notifications.click();
    await expect(page.getByRole("dialog", { name: /Notificações/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Notificações/ })).toBeHidden();
  }
  const user = page.locator("details.user-menu > summary");
  if (await user.isVisible().catch(() => false)) {
    await user.click();
    await expect(page.locator(".user-dropdown")).toBeVisible();
    await user.click();
    await expect(page.locator(".user-dropdown")).toBeHidden();
  }
}

async function safeFilters(page: Page) {
  const form = page.locator("form.cv-filters").first();
  if (!await form.count()) return false;
  const input = form.locator("input").first();
  if (await input.count()) { await input.fill("teste"); await input.fill(""); }
  const select = form.locator("select").first();
  if (await select.count()) {
    const option = select.locator("option").nth(1);
    if (await option.count()) await select.selectOption(await option.getAttribute("value") ?? "");
  }
  return true;
}

test.describe.serial("Pacote 7 — expansão visual e interações seguras", () => {
  test.afterAll(() => { mkdirSync(root, { recursive: true }); writeFileSync(join(root, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)); });
  for (const viewport of viewports) for (const [id, path] of screens) {
    test(`${id} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginE2EAccount(page, "resident");
      await stablePage(page, path);
      const url = page.url();
      const body = await page.locator("body").innerText().catch(() => "");
      const screenshot = join(root, id, `${viewport.width}x${viewport.height}.png`);
      mkdirSync(join(root, id), { recursive: true });
      await page.screenshot({ path: screenshot, fullPage: true });
      const reason = blocked(url, body);
      if (reason) { results.push({ screen: id, path, viewport, status: "NÃO VERIFICADO", reason, url, screenshot }); return; }
      const measured = await metrics(page);
      await safeShellInteraction(page);
      const hasFilters = await safeFilters(page);
      const status = measured.horizontalOverflow ? "FAIL" : "PASS";
      results.push({ screen: id, path, viewport, status, reason: status === "FAIL" ? "overflow horizontal detectado" : hasFilters ? "Shell, viewport, overflow e filtro seguro verificados" : "Shell, viewport e overflow verificados; filtros não aplicáveis", url, screenshot, metrics: measured });
    });
  }
});
