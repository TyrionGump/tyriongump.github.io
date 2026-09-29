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

for (const [path, title] of [
  ["/", "Andrew — Software Engineer"],
  ["/work/", "Work — Andrew"],
  ["/personal/", "Personal — Andrew"],
] as const) {
  test(`${path} has its own title`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  });
}

test("an old #route link lands on the real page", async ({ page }) => {
  await page.goto("/#work");
  await expect(page).toHaveURL(/\/work\/$/);
  await expectOnWork(page);
});

test("the 404 page links back to Home", async ({ page }) => {
  await page.goto("/404.html");
  await expect(page.getByRole("heading", { name: "zsh: no such page" })).toBeVisible();

  await page.getByRole("link", { name: "Home →" }).click();
  await expectOnHome(page);
});

test("the skip link moves focus past the navigation", async ({ page }) => {
  await page.goto("/personal/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const path of ["/", "/404.html"]) {
    test(`${path} never scrolls while its entrance plays`, async ({ page }) => {
      // Records the largest overflow in every frame, from before the first paint.
      await page.addInitScript(() => {
        const record = () => {
          const root = document.documentElement;
          const overflow = root.scrollHeight - root.clientHeight;
          const win = window as unknown as { maxOverflow?: number };
          win.maxOverflow = Math.max(win.maxOverflow ?? 0, overflow);
          requestAnimationFrame(record);
        };
        requestAnimationFrame(record);
      });
      await page.goto(path);
      await page.waitForTimeout(1500);

      const maxOverflow = await page.evaluate(
        () => (window as unknown as { maxOverflow?: number }).maxOverflow,
      );
      expect(maxOverflow).toBe(0);
    });
  }
});
