import { expect, test, type Page } from "@playwright/test";

const openConsole = async (page: Page) => {
  await page.keyboard.press("`");
  const prompt = page.getByRole("textbox", { name: "Console command" });
  await expect(prompt).toBeFocused();
  return prompt;
};

const menuOption = (page: Page, route: string) =>
  page.locator(`[data-home-menu-option="${route}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(menuOption(page, "work")).toHaveClass(/is-selected/);
});

test("with nothing focused, ↓ then Enter follows the menu", async ({ page }) => {
  await page.keyboard.press("ArrowDown");
  await expect(menuOption(page, "personal")).toHaveClass(/is-selected/);

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/personal/);
});

test("with a menu option focused, ↓ still moves the selection", async ({ page }) => {
  await menuOption(page, "work").focus();
  await page.keyboard.press("ArrowDown");

  await expect(menuOption(page, "personal")).toHaveClass(/is-selected/);
});

test("Enter in the console runs the command and does not follow the menu", async ({ page }) => {
  const prompt = await openConsole(page);
  await prompt.fill("help");
  await prompt.press("Enter");

  await expect(page.locator("[data-console-output]")).toContainText("clear");
  await expect(page).not.toHaveURL(/work/);
});

test("↑/↓ in the console do not move the menu selection", async ({ page }) => {
  const prompt = await openConsole(page);
  await prompt.press("ArrowDown");

  await expect(menuOption(page, "work")).toHaveClass(/is-selected/);
  await expect(menuOption(page, "personal")).not.toHaveClass(/is-selected/);
});

test("Enter on the navigation's console button opens the console", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Open console" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "Console command" })).toBeFocused();
  await expect(page).not.toHaveURL(/work/);
});

test("Enter on a navigation link follows that link, not the menu", async ({ page }) => {
  await page.getByRole("link", { name: "Personal" }).first().focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/personal/);
});
