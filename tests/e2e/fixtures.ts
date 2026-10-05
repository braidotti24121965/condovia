import { expect, test as base, type Page } from "@playwright/test";

export type E2EAccount = "resident" | "doorman";

type LoginFixture = {
  loginAs: (account: E2EAccount) => Promise<void>;
};

function credentialsFor(account: E2EAccount) {
  const prefix = account === "resident" ? "E2E_RESIDENT" : "E2E_DOORMAN";
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`Configure ${prefix}_EMAIL e ${prefix}_PASSWORD no ambiente local.`);
  }
  return { email, password };
}

export async function loginE2EAccount(page: Page, account: E2EAccount) {
  const credentials = credentialsFor(account);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/);
  await expect(page.locator(".app-shell")).toBeVisible();
}

export const test = base.extend<LoginFixture>({
  loginAs: async ({ page }, use) => {
    const loginAsAccount = (account: E2EAccount) => loginE2EAccount(page, account);
    // Playwright's fixture callback is named `use`; it is not a React Hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginAsAccount);
  },
});

export { expect };
