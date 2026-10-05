import { randomBytes } from "node:crypto";
import type { Browser, Locator, Page } from "@playwright/test";
import { expect, loginE2EAccount, test } from "./fixtures";

const runId = randomBytes(5).toString("hex");
const baseURL = "http://127.0.0.1:3000";
const rlsErrorPattern = /new row violates row-level security policy|SQLSTATE\s*[:=]?\s*42501|permission denied for (?:table|relation|function|sequence)\s+["']?[\w.]+/i;

function uniqueLabel(prefix: string) {
  return `E2E P4.5 ${prefix} ${runId}`;
}

function watchApplicationErrors(page: Page) {
  const errors: string[] = [];
  const responseChecks: Promise<void>[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    if (response.status() >= 500) errors.push(`Application POST returned HTTP ${response.status()}.`);
    responseChecks.push(
      response.text().then((body) => {
        if (rlsErrorPattern.test(body)) errors.push("A POST response contained an RLS/authorization error.");
      }).catch(() => undefined),
    );
  });

  return async () => {
    await Promise.all(responseChecks);
    const visibleText = await page.locator("body").innerText().catch(() => "");
    expect(rlsErrorPattern.test(visibleText), "the UI must not display an RLS/authorization error").toBe(false);
    expect(errors, "the browser/application must not report errors").toEqual([]);
  };
}

async function createActorPage(browser: Browser, account: "resident" | "doorman") {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const assertNoApplicationErrors = watchApplicationErrors(page);
  await loginE2EAccount(page, account);
  return { context, page, assertNoApplicationErrors };
}

async function selectOptionByText(select: Locator, text: string) {
  const option = select.locator("option").filter({ hasText: text });
  await expect(option, `expected one select option containing ${text}`).toHaveCount(1);
  const value = await option.getAttribute("value");
  expect(value, `option ${text} must have a value`).toBeTruthy();
  await select.selectOption(value!);
}

async function authorizeNewVisitor(page: Page, visitorName: string, assertNoApplicationErrors: () => Promise<void>) {
  await page.goto("/app/my-units");
  await expect(page.getByRole("heading", { name: "Minhas Unidades", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nova Autorização" }).click();

  const dialog = page.getByRole("dialog");
  await selectOptionByText(dialog.getByLabel(/Unidade de destino/), "Unidade 101");
  await dialog.getByLabel("Visitante").selectOption("new");
  await dialog.getByLabel("Nome *").fill(visitorName);
  await dialog.getByRole("button", { name: "Conceder Autorização" }).click();
  await expect(dialog.getByText("Autorização concedida com sucesso!")).toBeVisible();
  await assertNoApplicationErrors();
}

test.describe.serial("P4.5.7 — Smoke UI da Portaria", () => {
  test("S1 — resident cria autorização pela UI", async ({ page, loginAs }) => {
    const assertNoApplicationErrors = watchApplicationErrors(page);
    const visitorName = uniqueLabel("S1 visitante");

    await loginAs("resident");
    await authorizeNewVisitor(page, visitorName, assertNoApplicationErrors);

    await page.reload();
    await page.getByRole("button", { name: /Minhas Autorizações/ }).click();
    await expect(page.getByRole("row").filter({ hasText: visitorName })).toBeVisible();
    await assertNoApplicationErrors();
  });

  test("S2 — doorman solicita e resident aprova pela UI", async ({ page, loginAs, browser }) => {
    const assertNoApplicationErrors = watchApplicationErrors(page);
    const visitorName = uniqueLabel("S2 visitante");
    const requestNote = uniqueLabel("solicitacao");

    await loginAs("doorman");
    await page.goto("/app/gatehouse/visitors");
    await page.getByRole("button", { name: "Novo Visitante" }).click();
    const visitorDialog = page.getByRole("dialog");
    await visitorDialog.getByLabel(/Nome completo/).fill(visitorName);
    await visitorDialog.getByRole("button", { name: "Salvar Visitante" }).click();
    await expect(visitorDialog.getByText("Visitante cadastrado com sucesso!")).toBeVisible();
    await assertNoApplicationErrors();

    await page.goto("/app/gatehouse");
    await page.getByRole("button", { name: /Solicitar autorização/ }).click();
    const requestDialog = page.getByRole("dialog");
    await selectOptionByText(requestDialog.getByLabel("Unidade de destino"), "Unidade 101");
    await requestDialog.locator('[name="target_type"]').selectOption("visitor");
    await selectOptionByText(requestDialog.locator('[name="target_id"]'), visitorName);
    await requestDialog.getByLabel(/Mensagem \/ Justificativa para o morador/).fill(requestNote);
    await requestDialog.getByRole("button", { name: "Enviar Solicitação" }).click();
    await expect(requestDialog.getByText("Solicitação de acesso enviada ao morador!")).toBeVisible();
    await assertNoApplicationErrors();

    const resident = await createActorPage(browser, "resident");
    try {
      await resident.page.goto("/app/my-units");
      const requestRow = resident.page.getByRole("row").filter({ hasText: visitorName });
      await expect(requestRow).toBeVisible();
      await requestRow.getByRole("button", { name: "Aprovar" }).click();
      await expect(requestRow.getByText("Aprovado")).toBeVisible();
      await resident.assertNoApplicationErrors();
    } finally {
      await resident.context.close();
    }
  });

  test("S3 — doorman registra entrada, presença e saída pela UI", async ({ page, loginAs, browser }) => {
    const assertNoApplicationErrors = watchApplicationErrors(page);
    const visitorName = uniqueLabel("S3 visitante");

    await loginAs("resident");
    await authorizeNewVisitor(page, visitorName, assertNoApplicationErrors);

    const doorman = await createActorPage(browser, "doorman");
    try {
      await doorman.page.goto("/app/gatehouse");
      await doorman.page.getByRole("button", { name: /Registrar entrada/ }).click();
      const entryDialog = doorman.page.getByRole("dialog");
      await selectOptionByText(entryDialog.getByLabel("Autorização válida"), visitorName);
      await selectOptionByText(entryDialog.getByLabel("Ponto de acesso"), "E2E Portaria Principal");
      await entryDialog.getByRole("button", { name: "Confirmar Entrada" }).click();
      await expect(entryDialog.getByText("Entrada registrada com sucesso!")).toBeVisible();
      await doorman.assertNoApplicationErrors();

      await doorman.page.goto("/app/gatehouse/access");
      const presenceRow = doorman.page.getByRole("row").filter({ hasText: visitorName });
      await expect(presenceRow).toBeVisible();

      await doorman.page.goto("/app/gatehouse");
      await doorman.page.getByRole("button", { name: /Registrar saída/ }).click();
      const exitDialog = doorman.page.getByRole("dialog");
      await selectOptionByText(exitDialog.getByLabel("Pessoa dentro agora"), visitorName);
      await exitDialog.getByRole("button", { name: "Confirmar Saída" }).click();
      await expect(exitDialog.getByText("Saída registrada com sucesso!")).toBeVisible();
      await doorman.assertNoApplicationErrors();

      await doorman.page.goto("/app/gatehouse/access");
      await expect(doorman.page.getByRole("row").filter({ hasText: visitorName })).toHaveCount(0);

      await doorman.page.goto("/app/gatehouse/history");
      const historyRows = doorman.page.getByRole("row").filter({ hasText: visitorName });
      await expect(historyRows).toHaveCount(2);
      await expect(historyRows.filter({ hasText: "Entrada" })).toBeVisible();
      await expect(historyRows.filter({ hasText: "Saída" })).toBeVisible();
      await doorman.assertNoApplicationErrors();
    } finally {
      await doorman.context.close();
    }
  });

  test("S4 — doorman recebe e registra retirada da encomenda pela UI", async ({ page, loginAs }) => {
    const assertNoApplicationErrors = watchApplicationErrors(page);
    const description = uniqueLabel("S4 encomenda");
    const collector = uniqueLabel("retirada por");

    await loginAs("doorman");
    await page.goto("/app/gatehouse/packages");
    await page.getByRole("button", { name: "Receber Encomenda" }).click();
    const receiveDialog = page.getByRole("dialog");
    await selectOptionByText(receiveDialog.getByLabel(/Unidade destinatária/), "Unidade 101");
    await receiveDialog.getByLabel(/Descrição da encomenda/).fill(description);
    await receiveDialog.getByLabel(/Transportadora \/ Entregador/).fill("Transportadora E2E");
    await receiveDialog.getByRole("button", { name: "Confirmar Recebimento" }).click();
    await expect(receiveDialog.getByText("Encomenda registrada com sucesso!")).toBeVisible();
    await assertNoApplicationErrors();

    await page.reload();
    const waitingRow = page.getByRole("row").filter({ hasText: description });
    await expect(waitingRow).toBeVisible();
    await waitingRow.getByRole("button", { name: "Entregar" }).click();

    const collectionDialog = page.getByRole("dialog");
    await expect(collectionDialog.getByRole("heading", { name: "Registrar Retirada" })).toBeVisible();
    await collectionDialog.getByLabel(/Nome de quem retirou/).fill(collector);
    await collectionDialog.getByRole("button", { name: "Confirmar Entrega" }).click();
    await expect(collectionDialog.getByText("Encomenda baixada com sucesso!")).toBeVisible();
    await assertNoApplicationErrors();

    await page.reload();
    await expect(page.getByRole("heading", { name: /Encomendas Retiradas Recentemente/ })).toBeVisible();
    const collectedRow = page.getByRole("row").filter({ hasText: description });
    await expect(collectedRow).toBeVisible();
    await expect(collectedRow).toContainText(collector);
    await assertNoApplicationErrors();
  });
});
