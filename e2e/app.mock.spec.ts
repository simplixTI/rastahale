import { test, expect } from "@playwright/test";
import {
  DEMO_ADMIN, DEMO_STUDENT,
  blockExternalNetwork, collectPageErrors, expectNoHorizontalScroll, login, snap,
} from "./helpers";

// Roda no celular (Pixel 7) e no desktop (1440×900) — ver playwright.mock.config.ts.
// Modo demo: nenhum backend real é usado.

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
});

const STUDENT_ROUTES = [
  ["home",           "/"],
  ["buscar",         "/buscar"],
  ["professores",    "/professores"],
  ["favoritos",      "/favoritos"],
  ["ranking",        "/progresso"],
  ["perfil",         "/perfil"],
  ["perfil-editar",  "/perfil/editar"],
  ["meu-plano",      "/perfil/plano"],
  ["configuracoes",  "/perfil/configuracoes"],
  ["video",          "/video/v1"],
  ["suporte",        "/suporte"],
] as const;

const ADMIN_ROUTES = [
  ["admin-painel",      "/admin"],
  ["admin-videos",      "/admin/videos"],
  ["admin-instrutores", "/admin/instrutores"],
  ["admin-usuarios",    "/admin/usuarios"],
  ["admin-pagamentos",  "/admin/pagamentos"],
  ["admin-planos",      "/admin/planos"],
  ["admin-temporada",   "/admin/temporada"],
  ["admin-modulos",     "/admin/modulos"],
  ["admin-loja",        "/admin/loja"],
] as const;

test.describe("visitante", () => {
  for (const path of ["/", "/buscar", "/perfil", "/video/v1", "/admin", "/admin/usuarios", "/studio"]) {
    test(`${path} manda para o login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("tela de login cabe na tela e tem os campos", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expectNoHorizontalScroll(page, "login");
    await snap(page, testInfo, "login");
    expect(errors).toEqual([]);
  });

  test("senha errada fica no login e avisa", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', DEMO_STUDENT.email);
    await page.fill('input[type="password"]', "senha-errada");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Email ou senha incorretos")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("páginas públicas abrem sem login", async ({ page }) => {
    for (const path of ["/privacidade", "/termos", "/excluir-conta", "/esqueci-senha"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("#root")).not.toBeEmpty();
    }
  });

  test("rota inexistente mostra a página 404", async ({ page }) => {
    await page.goto("/rota-que-nao-existe");
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page).toHaveURL(/rota-que-nao-existe/);
  });
});

test.describe("aluno", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_STUDENT);
  });

  test("entra na home e vê a navegação principal", async ({ page }) => {
    await expect(page).toHaveURL(/\/$/);
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(nav).toBeVisible();
    for (const label of ["Home", "Buscar", "Professores", "Favoritos", "Ranking", "Perfil"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("a navegação inferior leva a cada seção", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    const destinations: Array<[string, RegExp]> = [
      ["Buscar", /\/buscar$/], ["Professores", /\/professores$/], ["Favoritos", /\/favoritos$/],
      ["Ranking", /\/progresso$/], ["Perfil", /\/perfil$/], ["Home", /\/$/],
    ];
    for (const [label, url] of destinations) {
      await nav.getByRole("button", { name: label }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test("navegação: menu lateral no desktop, barra embaixo no celular", async ({ page }, testInfo) => {
    const viewport = page.viewportSize()!;
    const box = (await page.getByRole("navigation", { name: "Navegação principal" }).boundingBox())!;
    if (testInfo.project.name === "desktop") {
      expect(box.x, "colado na esquerda").toBe(0);
      expect(box.width, "lateral estreita").toBeLessThan(300);
      expect(box.height, "ocupa a altura toda").toBeGreaterThan(viewport.height * 0.9);
    } else {
      expect(Math.round(box.y + box.height), "colada embaixo").toBe(viewport.height);
      expect(box.width, "largura toda").toBeGreaterThanOrEqual(viewport.width - 1);
    }
  });

  test("a coluna de conteúdo usa a largura certa em cada tela", async ({ page }, testInfo) => {
    const column = (await page.locator(".app-page").first().boundingBox())!;
    if (testInfo.project.name === "desktop") {
      expect(column.width, "no desktop não é uma coluna de celular").toBeGreaterThan(800);
      expect(column.width).toBeLessThanOrEqual(1024);
      expect(column.x, "começa depois do menu lateral").toBeGreaterThan(240);
    } else {
      expect(column.width).toBeLessThanOrEqual(430);
    }
  });

  test("busca: 4 colunas no desktop, 2 no celular", async ({ page }, testInfo) => {
    await page.goto("/buscar");
    const cards = page.locator("button:has(img)").filter({ hasText: /\d{1,2}:\d{2}/ });
    await expect(cards.first()).toBeVisible();
    const tops = await cards.evaluateAll((els) => els.slice(0, 8).map((el) => Math.round(el.getBoundingClientRect().top)));
    const perRow = tops.filter((top) => top === tops[0]).length;
    expect(perRow).toBe(testInfo.project.name === "desktop" ? 4 : 2);
  });

  for (const [name, path] of STUDENT_ROUTES) {
    test(`${path} abre sem erro e cabe na tela`, async ({ page }, testInfo) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
      await expect(page.locator("#root")).not.toBeEmpty();
      await page.waitForLoadState("networkidle").catch(() => {});
      await expectNoHorizontalScroll(page, path);
      await snap(page, testInfo, name);
      expect(errors, `erros de JS em ${path}`).toEqual([]);
    });
  }

  test("não entra em /admin nem em /studio", async ({ page }) => {
    for (const path of ["/admin", "/admin/usuarios", "/admin/pagamentos", "/studio", "/studio/feedback"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/$/);
    }
  });

  test("a sessão sobrevive a recarregar a página", async ({ page }) => {
    await page.goto("/perfil");
    await page.reload();
    await expect(page).toHaveURL(/\/perfil$/);
  });

  test("login já feito: /login volta para a home", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
  });

  test("sair leva ao login e fecha as rotas protegidas", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN);
  });

  test("login de admin cai no painel", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("menu: lateral completo no desktop, barra de 7 abas no celular", async ({ page }, testInfo) => {
    const nav = page.getByRole("navigation", { name: "Administração" });
    await expect(nav).toBeVisible();
    const box = (await nav.boundingBox())!;
    if (testInfo.project.name === "desktop") {
      expect(box.x).toBe(0);
      expect(box.width).toBeLessThan(300);
      // Módulos e Loja só têm lugar no menu lateral.
      await expect(nav.getByRole("button", { name: "Módulos" })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Loja" })).toBeVisible();
    } else {
      expect(Math.round(box.y + box.height)).toBe(page.viewportSize()!.height);
      await expect(nav.getByRole("button")).toHaveCount(7);
      await expect(nav.getByRole("button", { name: "Módulos" })).toHaveCount(0);
    }
  });

  test("painel: números em 4 colunas no desktop, 2 no celular", async ({ page }, testInfo) => {
    await page.goto("/admin");
    const cards = page.locator("button:has(p.text-xl)");
    await expect(cards).toHaveCount(4);
    const tops = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    const perRow = tops.filter((top) => top === tops[0]).length;
    expect(perRow).toBe(testInfo.project.name === "desktop" ? 4 : 2);
  });

  for (const [name, path] of ADMIN_ROUTES) {
    test(`${path} abre sem erro e cabe na tela`, async ({ page }, testInfo) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
      await expect(page.locator("#root")).not.toBeEmpty();
      await page.waitForLoadState("networkidle").catch(() => {});
      await expectNoHorizontalScroll(page, path);
      await snap(page, testInfo, name);
      expect(errors, `erros de JS em ${path}`).toEqual([]);
    });
  }

  test("admin não entra no Studio do professor", async ({ page }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/$/);
  });

  test("sair leva ao login e fecha o admin", async ({ page }) => {
    await page.getByRole("button", { name: /Sair/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});
