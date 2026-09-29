import { expect, test, type Page } from "@playwright/test";

const commitToggle = (page: Page, projectId: string) =>
  page.locator(`[data-commit="${projectId}"]`).getByRole("button", { name: /file/ });

const goToWork = async (page: Page) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(page.locator("[data-work-graph]")).toBeVisible();
};

test("commits start closed, and open one at a time", async ({ page }) => {
  await goToWork(page);
  const ledger = commitToggle(page, "ledger");
  const harbor = commitToggle(page, "harbor");
  await expect(ledger).toHaveAttribute("aria-expanded", "false");
  await expect(harbor).toHaveAttribute("aria-expanded", "false");

  await ledger.click();
  await expect(ledger).toHaveAttribute("aria-expanded", "true");
  await expect(ledger).toHaveText("close file");
  await expect(page.getByText("Two banks, one transfer")).toBeVisible();

  await harbor.click();
  await expect(harbor).toHaveAttribute("aria-expanded", "true");
  await expect(ledger).toHaveAttribute("aria-expanded", "false");

  await harbor.click();
  await expect(harbor).toHaveAttribute("aria-expanded", "false");
});

test("an open commit stays open after a visit to another page", async ({ page }) => {
  await goToWork(page);
  await commitToggle(page, "ledger").click();
  await expect(commitToggle(page, "ledger")).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("link", { name: "Personal →" }).click();
  await page.getByRole("link", { name: "Work →" }).click();

  await expect(commitToggle(page, "ledger")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Two banks, one transfer")).toBeVisible();
});

const firstCodeLine = (page: Page, projectId: string) =>
  page.locator(`[data-commit="${projectId}"] [data-source-line]`).first();
const firstConsoleLine = (page: Page, projectId: string) =>
  page.locator(`[data-commit="${projectId}"] [data-commit-console-line]`).first();

test("with reduced motion, an opened commit shows its code and output at once", async ({
  page,
}) => {
  await goToWork(page);
  await commitToggle(page, "ledger").click();

  await expect(firstCodeLine(page, "ledger")).toHaveCSS("opacity", "1");
  await expect(firstConsoleLine(page, "ledger")).toHaveCSS("opacity", "1");
});

test("a commit that is still open on a return visit shows its code", async ({ page }) => {
  await goToWork(page);
  await commitToggle(page, "ledger").click();
  await page.getByRole("link", { name: "Personal →" }).click();
  await page.getByRole("link", { name: "Work →" }).click();

  await expect(commitToggle(page, "ledger")).toHaveAttribute("aria-expanded", "true");
  await expect(firstCodeLine(page, "ledger")).toHaveCSS("opacity", "1");
});

test("each line of code is one row tall", async ({ page }) => {
  await goToWork(page);
  await commitToggle(page, "ledger").click();

  await expect(firstCodeLine(page, "ledger")).toHaveCSS("height", "21px");
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the graph finishes drawing and the commit text appears", async ({ page }) => {
    await goToWork(page);
    await expect(page.locator('[data-commit="harbor"] [data-graph-text]')).toHaveCSS(
      "opacity",
      "1",
      {
        timeout: 10_000,
      },
    );
  });

  test("an opened commit counts its metrics up to their real values", async ({ page }) => {
    await goToWork(page);
    await commitToggle(page, "ledger").click();

    const metrics = page.locator('[data-commit="ledger"] [data-commit-metric-value]');
    // The built page already shows the final values, so first see the count start.
    await expect(metrics.first()).not.toHaveText("12,000");
    await expect(metrics).toHaveText(["12,000", "3", "99.99%"], { timeout: 5_000 });
  });

  test("the Home intro finishes and the menu takes the keyboard", async ({ page }) => {
    await page.goto("/");
    // The animated copy is appended after the baked one, so it is the last menu.
    const menu = page.locator("[data-home-terminal-menu]").last();
    await expect(menu).toHaveClass(/is-revealed/, { timeout: 10_000 });

    await page.keyboard.press("ArrowDown");
    const personal = menu.locator('[data-home-menu-option="personal"]');
    await expect(personal).toHaveClass(/is-selected/);
  });
});
