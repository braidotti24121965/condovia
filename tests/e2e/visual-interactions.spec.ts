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
  { id: "dashboard", path: "/app/dashboard" },
  { id: "imports", path: "/app/condominium/imports" },
  { id: "units", path: "/app/condominium/units" },
  { id: "owners", path: "/app/condominium/owners" },
] as const;

type InteractionResult = {
  screen: string;
  viewport: { width: number; height: number };
  interaction: string;
  status: "PASS" | "FAIL" | "NÃO VERIFICADO";
  reason: string;
  screenshot?: string;
};

const results: InteractionResult[] = [];
const artifactRoot = join(process.cwd(), "test-results", "pacote7-interactions");

function addResult(result: InteractionResult) {
  results.push(result);
}

async function safeScreenshot(page: Page, name: string) {
  const path = join(artifactRoot, "failures", `${name}.png`);
  mkdirSync(join(artifactRoot, "failures"), { recursive: true });
  try {
    await page.screenshot({ path, fullPage: true });
    return path;
  } catch {
    return undefined;
  }
}

async function openAndVerify(page: Page, screen: (typeof screens)[number]) {
  await page.goto(screen.path, { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.readyState === "complete");
  return page.url();
}

async function exerciseShell(page: Page, screen: (typeof screens)[number], viewport: (typeof viewports)[number]) {
  const mobileMenu = page.getByRole("button", { name: "Abrir menu" });
  if (await mobileMenu.isVisible().catch(() => false)) {
    try {
      await mobileMenu.click();
      await expect(page.getByRole("complementary", { name: "Navegação principal" }).getByRole("button", { name: "Fechar menu" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".drawer-backdrop")).toBeHidden();
      addResult({ screen: screen.id, viewport, interaction: "sidebar mobile abrir/fechar por Escape", status: "PASS", reason: "sidebar abriu e fechou sem persistência" });
    } catch (error) {
      const screenshot = await safeScreenshot(page, `${screen.id}-${viewport.width}-sidebar`);
      addResult({ screen: screen.id, viewport, interaction: "sidebar mobile abrir/fechar por Escape", status: "FAIL", reason: error instanceof Error ? error.message : "falha desconhecida", screenshot });
    }
  } else {
    addResult({ screen: screen.id, viewport, interaction: "sidebar mobile abrir/fechar por Escape", status: "NÃO VERIFICADO", reason: "controle mobile não aplicável nesta resolução ou perfil" });
  }

  const notification = page.getByRole("button", { name: /^Notificações/ });
  if (await notification.isVisible().catch(() => false)) {
    try {
      await notification.click();
      await expect(page.getByRole("dialog", { name: /Notificações/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: /Notificações/ })).toBeHidden();
      addResult({ screen: screen.id, viewport, interaction: "central de notificações abrir/fechar", status: "PASS", reason: "popover abriu e fechou por Escape" });
    } catch (error) {
      const screenshot = await safeScreenshot(page, `${screen.id}-${viewport.width}-notifications`);
      addResult({ screen: screen.id, viewport, interaction: "central de notificações abrir/fechar", status: "FAIL", reason: error instanceof Error ? error.message : "falha desconhecida", screenshot });
    }
  } else {
    addResult({ screen: screen.id, viewport, interaction: "central de notificações abrir/fechar", status: "NÃO VERIFICADO", reason: "botão de notificações não disponível" });
  }

  const userSummary = page.locator("details.user-menu > summary");
  if (await userSummary.isVisible().catch(() => false)) {
    try {
      await userSummary.click();
      await expect(page.locator(".user-dropdown")).toBeVisible();
      await userSummary.click();
      await expect(page.locator(".user-dropdown")).toBeHidden();
      addResult({ screen: screen.id, viewport, interaction: "menu do usuário abrir/fechar", status: "PASS", reason: "menu abriu e fechou sem acionar logout" });
    } catch (error) {
      const screenshot = await safeScreenshot(page, `${screen.id}-${viewport.width}-user-menu`);
      addResult({ screen: screen.id, viewport, interaction: "menu do usuário abrir/fechar", status: "FAIL", reason: error instanceof Error ? error.message : "falha desconhecida", screenshot });
    }
  } else {
    addResult({ screen: screen.id, viewport, interaction: "menu do usuário abrir/fechar", status: "NÃO VERIFICADO", reason: "menu do usuário não disponível" });
  }
}

async function exerciseFilters(page: Page, screen: (typeof screens)[number], viewport: (typeof viewports)[number]) {
  const filters = page.locator("form.cv-filters");
  if (await filters.count() === 0) {
    addResult({ screen: screen.id, viewport, interaction: "filtros e seletores", status: "NÃO VERIFICADO", reason: "tela não possui filtros aplicáveis" });
    return;
  }
  try {
    const input = filters.locator("input").first();
    if (await input.count()) {
      await input.fill("teste");
      await input.fill("");
    }
    const select = filters.locator("select").first();
    if (await select.count()) {
      const option = select.locator("option").nth(1);
      if (await option.count()) await select.selectOption(await option.getAttribute("value") ?? "");
    }
    addResult({ screen: screen.id, viewport, interaction: "filtros e seletores", status: "PASS", reason: "controles manipulados sem submeter o formulário" });
  } catch (error) {
    const screenshot = await safeScreenshot(page, `${screen.id}-${viewport.width}-filters`);
    addResult({ screen: screen.id, viewport, interaction: "filtros e seletores", status: "FAIL", reason: error instanceof Error ? error.message : "falha desconhecida", screenshot });
  }
}

async function exerciseOwnersForm(page: Page, screen: (typeof screens)[number], viewport: (typeof viewports)[number]) {
  if (screen.id !== "owners") return;
  try {
    await page.goto("/app/condominium/owners?new=1&relationship=ownership", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.readyState === "complete");
    const heading = page.getByRole("heading", { name: "Novo proprietário", exact: true });
    if (await heading.count() === 0) {
      addResult({ screen: screen.id, viewport, interaction: "abrir formulário Novo proprietário via ?new=1", status: "NÃO VERIFICADO", reason: "formulário não renderizado para o perfil/contexto atual" });
      return;
    }
    await expect(heading).toBeVisible();
    addResult({ screen: screen.id, viewport, interaction: "abrir formulário Novo proprietário via ?new=1", status: "PASS", reason: "formulário aberto sem submissão" });
  } catch (error) {
    const screenshot = await safeScreenshot(page, `${screen.id}-${viewport.width}-owner-form`);
    addResult({ screen: screen.id, viewport, interaction: "abrir formulário Novo proprietário via ?new=1", status: "FAIL", reason: error instanceof Error ? error.message : "falha desconhecida", screenshot });
  }
}

test.describe.serial("Pacote 7 — interações seguras", () => {
  test.afterAll(() => {
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(join(artifactRoot, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  });

  for (const viewport of viewports) {
    for (const screen of screens) {
      test(`${screen.id} ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginE2EAccount(page, "resident");
        const url = await openAndVerify(page, screen);
        if (/\/no-permission|\/select-context|\/login/.test(url)) {
          addResult({ screen: screen.id, viewport, interaction: "interações seguras", status: "NÃO VERIFICADO", reason: `rota bloqueada em ${url}` });
          return;
        }
        await exerciseShell(page, screen, viewport);
        await exerciseFilters(page, screen, viewport);
        await exerciseOwnersForm(page, screen, viewport);
      });
    }
  }
});
