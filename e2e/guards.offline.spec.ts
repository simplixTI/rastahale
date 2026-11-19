import { test, expect } from "@playwright/test";
import { blockExternalNetwork } from "./helpers";

// Servidor em modo "real" (sem VITE_ENABLE_MOCK) apontando para um backend que não
// existe. Aqui nenhum usuário deve conseguir entrar em área protegida: o que o
// visitante escreve no próprio navegador não vale como sessão.

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
});

const forge = (page: import("@playwright/test").Page, role: string) =>
  page.addInitScript((r) => {
    sessionStorage.setItem(
      "rasta_auth_user",
      JSON.stringify({ id: "forjado-1", email: "intruso@example.com", name: "Intruso", role: r }),
    );
  }, role);

test.describe("sem sessão real", () => {
  for (const path of ["/", "/perfil", "/buscar", "/admin", "/admin/usuarios", "/studio"]) {
    test(`${path} → login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

test.describe("usuário forjado no sessionStorage (DevTools)", () => {
  for (const role of ["admin", "instructor", "user"]) {
    test(`papel "${role}" forjado NÃO abre nenhuma área protegida`, async ({ page }) => {
      await forge(page, role);
      for (const path of ["/", "/perfil", "/admin", "/admin/pagamentos", "/studio"]) {
        await page.goto(path);
        await expect(page, `${path} com ${role} forjado`).toHaveURL(/\/login$/);
      }
    });
  }
});
