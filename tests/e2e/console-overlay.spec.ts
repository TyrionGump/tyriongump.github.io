import { expect, test } from "@playwright/test";

test("the backtick key opens the console, and `help` lists the commands", async ({ page }) => {
  await page.goto("/#personal");

  await page.keyboard.press("`");
  const prompt = page.getByRole("textbox", { name: "Console command" });
  await expect(prompt).toBeFocused();

  await prompt.fill("help");
  await prompt.press("Enter");

  await expect(page.locator("[data-console-output]")).toContainText("clear");
});
