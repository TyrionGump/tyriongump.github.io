import { expect, test, type Page } from "@playwright/test";

const primaryNavigation = (page: Page) => page.getByRole("navigation", { name: "Primary" });

const expectOnHome = (page: Page) =>
  expect(page.locator("[data-home-terminal-panel]")).toBeVisible();
const expectOnWork = (page: Page) => expect(page.locator("[data-work-graph]")).toBeVisible();
const expectOnPersonal = (page: Page) =>
  expect(page.getByRole("heading", { name: "I’d rather delete code than add it." })).toBeVisible();

test("the navigation links reach every page", async ({ page }) => {
  await page.goto("/");
  await expectOnHome(page);

  await primaryNavigation(page).getByRole("link", { name: "Work", exact: true }).click();
  await expectOnWork(page);

  await primaryNavigation(page).getByRole("link", { name: "Personal", exact: true }).click();
  await expectOnPersonal(page);

  await primaryNavigation(page).getByRole("link", { name: "andrew" }).click();
  await expectOnHome(page);
});

test("each footer hands off to the next page", async ({ page }) => {
  await page.goto("/");
  await primaryNavigation(page).getByRole("link", { name: "Work", exact: true }).click();

  await page.getByRole("link", { name: "Personal →" }).click();
  await expectOnPersonal(page);

  await page.getByRole("link", { name: "Work →" }).click();
  await expectOnWork(page);
});

test("the back button returns to the previous page", async ({ page }) => {
  await page.goto("/");
  await primaryNavigation(page).getByRole("link", { name: "Work", exact: true }).click();
  await expectOnWork(page);

  await page.goBack();
  await expectOnHome(page);
});

test("the pages are readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hi, I'm Andrew." })).toBeVisible();

  await primaryNavigation(page).getByRole("link", { name: "Work", exact: true }).click();
  await expect(
    page.getByText("Moves money between banks without ever losing a cent."),
  ).toBeVisible();
  // Without script every commit ships expanded.
  await expect(page.getByText("Two banks, one transfer").first()).toBeVisible();

  await context.close();
});
