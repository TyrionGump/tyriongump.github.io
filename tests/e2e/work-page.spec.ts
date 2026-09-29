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
