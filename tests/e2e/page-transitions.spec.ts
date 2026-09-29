import { expect, test, type Page } from "@playwright/test";

// A page load would wipe this flag, so it proves the page changed in place.
const markDocument = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { sameDocument?: boolean }).sameDocument = true;
  });
const isSameDocument = (page: Page) =>
  page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument === true);

const primaryNavigation = (page: Page) => page.getByRole("navigation", { name: "Primary" });
const navigationLink = (page: Page, name: string) =>
  primaryNavigation(page).getByRole("link", { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await markDocument(page);
});

test("a link changes page in place, with the new title and navigation state", async ({ page }) => {
  await navigationLink(page, "Work").click();

  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page).toHaveTitle("Work — Andrew");
  await expect(page.locator("[data-work-graph]")).toBeVisible();
  await expect(navigationLink(page, "Work")).toHaveAttribute("aria-current", "page");
  expect(await isSameDocument(page)).toBe(true);
});

test("a page change announces the new page and resets focus, as a page load does", async ({
  page,
}) => {
  await navigationLink(page, "Personal").click();
  await expect(page).toHaveTitle("Personal — Andrew");

  await expect(page.locator("[aria-live]", { hasText: "Navigated to:" })).toContainText(
    "I’d rather delete code than add it.",
  );
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("the back button changes page in place", async ({ page }) => {
  await navigationLink(page, "Work").click();
  await expect(page.locator("[data-work-graph]")).toBeVisible();

  await page.goBack();
  await expect(page.locator("[data-home-terminal-panel]")).toBeVisible();
  expect(await isSameDocument(page)).toBe(true);
});

test("Home's keys stop working once you leave Home", async ({ page }) => {
  await navigationLink(page, "Work").click();
  await expect(page).toHaveTitle("Work — Andrew");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/work\/$/);
});

test("the console buttons still work after a page change", async ({ page }) => {
  await navigationLink(page, "Personal").click();
  await expect(page).toHaveTitle("Personal — Andrew");
  const prompt = page.getByRole("textbox", { name: "Console command" });

  await page.getByRole("button", { name: "terminal" }).click();
  await expect(prompt).toBeFocused();
  await prompt.press("Escape");

  await page.getByRole("button", { name: "Open console" }).click();
  await expect(prompt).toBeFocused();
});

test("script navigation changes page in place", async ({ page }) => {
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("Personal — Andrew");

  await page.keyboard.press("`");
  const prompt = page.getByRole("textbox", { name: "Console command" });
  await prompt.fill("work");
  await prompt.press("Enter");
  await expect(page).toHaveTitle("Work — Andrew");

  expect(await isSameDocument(page)).toBe(true);
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("going to Home announces its title, not the whole terminal", async ({ page }) => {
    await navigationLink(page, "Work").click();
    await expect(page).toHaveTitle("Work — Andrew");

    await primaryNavigation(page).getByRole("link", { name: "andrew" }).click();
    const announcer = page.locator("[aria-live]", { hasText: "Navigated to:" });
    await expect(announcer).toContainText("Andrew — Software Engineer");
    await expect(announcer).not.toContainText("whoami");
  });
});
