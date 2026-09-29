import { expect, test } from "@playwright/test";

// Today's bundle is about 78 KB. The limit leaves room to grow, but fails on a
// build-time tool, such as the highlighter, leaking into what visitors download.
const MAXIMUM_BYTES = 100_000;

test("the shipped JavaScript stays small and holds no build-time code", async ({ page }) => {
  await page.goto("/");
  const scripts = await page
    .locator('script[type="module"][src]')
    .evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
  expect(scripts.length).toBeGreaterThan(0);

  let totalBytes = 0;
  for (const source of await Promise.all(
    scripts.map((url) => page.request.get(url).then((response) => response.text())),
  )) {
    totalBytes += source.length;
    const leaked = ["shiki", "tokenizeLine"].filter((marker) => source.includes(marker));
    expect(leaked, "build-time code in the shipped JavaScript").toEqual([]);
  }
  expect(totalBytes).toBeLessThan(MAXIMUM_BYTES);
});
