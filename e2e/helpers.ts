import { expect, type Page, type TestInfo } from "@playwright/test";

// Credenciais do MODO DEMO (VITE_ENABLE_MOCK=true), as mesmas documentadas no CLAUDE.md.
// Só valem no mock local do e2e — não existem no Supabase de verdade.
export const DEMO_STUDENT = { email: "aluno@rastahale.com", password: "rasta123" };
export const DEMO_ADMIN   = { email: "admin@rastahale.com", password: "admin123" };

const LOCAL = /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

/**
 * Teste hermético: só o servidor local responde. Imagens externas (miniaturas de
 * demonstração) passam; qualquer outra chamada para fora é derrubada.
 */
export async function blockExternalNetwork(page: Page) {
  await page.route("**/*", (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("blob:") || LOCAL.test(url)) return route.continue();
    if (request.resourceType() === "image") return route.continue();
    return route.abort();
  });
}

/** Erros de JavaScript não tratados — o que de fato derruba uma tela. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill('input[type="email"]', who.email);
  await page.fill('input[type="password"]', who.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}

/** A página inteira cabe na largura da tela (sem rolagem horizontal). */
export async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: rola ${overflow}px na horizontal`).toBeLessThanOrEqual(1);
}

/**
 * Guarda uma captura em e2e-shots/ (ignorada pelo git). Fora de test-results/
 * de propósito: o Playwright apaga aquela pasta a cada execução.
 */
export async function snap(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: `e2e-shots/${testInfo.project.name}-${name}.png`,
    animations: "disabled",
  });
}
