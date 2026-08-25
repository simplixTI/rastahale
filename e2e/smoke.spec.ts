import { test, expect } from "@playwright/test";

// Smoke test: a página de login deve renderizar sem erros.
test("página de login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
