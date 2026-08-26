import { test, devices } from "@playwright/test";
import path from "path";
import fs from "fs";

// Capturas para o Google Play Console.
// 432x768 @ DSF 2.5 = imagem final 1080x1920 (9:16 exato — dentro dos limites do Play).
const OUT = path.join(process.cwd(), "screenshots");
fs.mkdirSync(OUT, { recursive: true });

test.use({
  viewport: { width: 432, height: 768 },
  deviceScaleFactor: 2.5,
  userAgent: devices["Pixel 7"].userAgent,
  hasTouch: true,
  isMobile: true,
  colorScheme: "light",
});

test("captura telas do app para o Play Console", async ({ page }) => {
  test.setTimeout(120_000);

  // Garante tema light mesmo se algum profile antigo tiver 'dark' salvo
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("rasta_theme", "light"));
  await page.reload();
  await page.fill('input[type="email"]', "aluno@rastahale.com");
  await page.fill('input[type="password"]', "rasta123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);

  const rotas: Array<[string, string]> = [
    ["01-home", "/"],
    ["02-buscar", "/buscar"],
    ["03-favoritos", "/favoritos"],
    ["04-progresso", "/progresso"],
    ["05-perfil", "/perfil"],
    ["06-professores", "/professores"],
  ];

  for (const [nome, rota] of rotas) {
    await page.goto(rota);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `${nome}.png`), fullPage: false });
    console.log(`✓ ${nome}.png`);
  }

  // Bônus: tela de detalhe de vídeo (se houver algum card clicável na home)
  await page.goto("/");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
  const primeiroVideo = page.locator('a[href^="/video/"]').first();
  if (await primeiroVideo.count() > 0) {
    await primeiroVideo.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, "07-video.png"), fullPage: false });
    console.log("✓ 07-video.png");
  }
});
