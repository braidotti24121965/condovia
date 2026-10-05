import { expect, test } from "./fixtures";

test("resident can sign in and the app stylesheet is loaded", async ({ page, loginAs }) => {
  await page.goto("/login");

  const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );
  expect(stylesheets.length, "the login page should include a stylesheet").toBeGreaterThan(0);
  const stylesheetStatuses = await Promise.all(
    stylesheets.map(async (href) => (await page.request.get(href)).status()),
  );
  expect(stylesheetStatuses.every((status) => status >= 200 && status < 400)).toBe(true);

  const authCardStyle = await page.locator(".auth-card").evaluate((element) => {
    const style = getComputedStyle(element);
    return { paddingTop: Number.parseFloat(style.paddingTop), borderRadius: style.borderRadius };
  });
  expect(authCardStyle.paddingTop).toBeGreaterThan(0);
  expect(authCardStyle.borderRadius).not.toBe("0px");

  await loginAs("resident");
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator(".app-shell")).toContainText("CondoVia");
});
