import { expect, test, type Page } from "@playwright/test";

const openConsole = async (page: Page) => {
  await page.keyboard.press("`");
  const prompt = page.getByRole("textbox", { name: "Console command" });
  await expect(prompt).toBeFocused();
  return prompt;
};

const run = async (page: Page, command: string) => {
  const prompt = page.getByRole("textbox", { name: "Console command" });
  await prompt.fill(command);
  await prompt.press("Enter");
};

const output = (page: Page) => page.locator("[data-console-output]");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Personal", exact: true })
    .click();
  await page.waitForURL("**/personal/");
});

test("the backtick key opens the console, and `help` lists the commands", async ({ page }) => {
  await openConsole(page);
  await run(page, "help");

  await expect(output(page)).toContainText("clear");
});

test("`ls` lists every project, and `open` describes one", async ({ page }) => {
  await openConsole(page);
  await run(page, "ls");
  await expect(output(page)).toContainText(/ledger[\s\S]*harbor[\s\S]*prism[\s\S]*sift/);

  await run(page, "open sift");
  await expect(output(page)).toContainText("forty terabytes of logs");

  await run(page, "open nothing");
  await expect(output(page)).toContainText("no such project: nothing");
});

test("an unknown command answers in the shell's voice", async ({ page }) => {
  await openConsole(page);
  await run(page, "rm -rf /");

  await expect(output(page)).toContainText("command not found: rm");
});

test("`clear` empties the output and `exit` closes the console", async ({ page }) => {
  const prompt = await openConsole(page);
  await run(page, "whoami");
  await expect(output(page)).toContainText("software engineer");

  await run(page, "clear");
  await expect(output(page)).toBeEmpty();

  await run(page, "exit");
  await expect(prompt).toBeHidden();
});

test("a route command goes to that page and closes the console", async ({ page }) => {
  const prompt = await openConsole(page);
  await run(page, "work");

  await expect(page.locator("[data-work-graph]")).toBeVisible();
  await expect(prompt).toBeHidden();
});

test("the transcript is still there after a route command", async ({ page }) => {
  await openConsole(page);
  await run(page, "whoami");
  await run(page, "work");
  await page.waitForURL("**/work/");

  await openConsole(page);
  await expect(output(page)).toContainText("software engineer");
});
