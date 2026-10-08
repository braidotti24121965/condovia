import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, loginE2EAccount, test } from "./fixtures";
import type { Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
] as const;

const screens = [
  { id: "dashboard", path: "/app/dashboard" },
  { id: "imports", path: "/app/condominium/imports" },
  { id: "units", path: "/app/condominium/units" },
  { id: "owners", path: "/app/condominium/owners" },
] as const;

type Result = {
  screen: string;
  path: string;
  viewport: { width: number; height: number };
  status: "PASS" | "FAIL" | "NÃO VERIFICADO";
  reason?: string;
  url?: string;
  screenshot?: string;
  metrics?: Record<string, unknown>;
};

const results: Result[] = [];
const artifactRoot = join(process.cwd(), "test-results", "pacote7-visual");

async function collectMetrics(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const candidates = [...document.querySelectorAll<HTMLElement>(
      ".app-shell, .topbar, .topbar-actions, .sidebar, .cv-page, .cv-panel, " +
      "button, a, input, select, textarea, [role=dialog]",
    )];
    const outside = candidates.map((element) => {
      const rect = element.getBoundingClientRect();
      return { element: element.className || element.tagName.toLowerCase(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }).filter((item) => item.left < -1 || item.right > viewportWidth + 1 || item.top < -1 || item.bottom > viewportHeight + 1);
    const essential = [
      ".app-shell", ".topbar", ".topbar-actions", ".sidebar",
      "button", "a", "input", "select", "textarea",
    ];
    return {
      innerWidth: viewportWidth,
      innerHeight: viewportHeight,
      visualViewportWidth: window.visualViewport?.width ?? null,
      visualViewportHeight: window.visualViewport?.height ?? null,
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth || document.body.scrollWidth > document.documentElement.clientWidth,
      outsideViewport: outside.slice(0, 30),
      essentialPresent: Object.fromEntries(essential.map((selector) => [selector, Boolean(document.querySelector(selector))])),
    };
      });
    } catch (error) {
      if (!(error instanceof Error) || !/Execution context was destroyed|Target page, context or browser has been closed/.test(error.message) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.locator("body").waitFor({ state: "visible" }).catch(() => undefined);
      await page.waitForFunction(() => document.readyState === "complete").catch(() => undefined);
    }
  }
  throw new Error("Medição não concluída após estabilização da página.");
}

function blockedReason(url: string, bodyText: string) {
  if (/\/login(?:\?|$)/.test(url)) return "redirecionado para login";
  if (/\/select-context(?:\?|$)/.test(url)) return "contexto exige seleção";
  if (/\/no-permission(?:\?|$)/.test(url) || /Acesso não disponível/i.test(bodyText)) return "permissão insuficiente";
  if (!/\/app(?:\/|$)/.test(url)) return "rota não carregou o Shell protegido";
  return undefined;
}

test.describe.serial("Pacote 7 — responsividade local", () => {
  test.afterAll(() => {
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(join(artifactRoot, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  });

  for (const viewport of viewports) {
    for (const screen of screens) {
      test(`${screen.id} ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginE2EAccount(page, "resident");
        await page.goto(screen.path, { waitUntil: "networkidle" });
        await page.waitForLoadState("domcontentloaded");
        await page.locator("body").waitFor({ state: "visible" });
        await page.waitForFunction(() => document.readyState === "complete");

        const metrics = await collectMetrics(page);
        const url = page.url();
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const reason = blockedReason(url, bodyText);
        const directory = join(artifactRoot, screen.id, `${viewport.width}x${viewport.height}`);
        const screenshot = join(directory, "screenshot.png");
        mkdirSync(dirname(screenshot), { recursive: true });
        await page.screenshot({ path: screenshot, fullPage: true });

        const status = reason ? "NÃO VERIFICADO" : metrics.horizontalOverflow ? "FAIL" : "PASS";
        results.push({
          screen: screen.id,
          path: screen.path,
          viewport,
          status,
          reason: reason ?? (status === "FAIL" ? "overflow horizontal detectado" : "viewport e Shell verificados"),
          url,
          screenshot,
          metrics,
        });

        expect(metrics.innerWidth).toBe(viewport.width);
        expect(metrics.innerHeight).toBe(viewport.height);
      });
    }
  }
});
