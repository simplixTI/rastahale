import { test, devices, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Capturas para o App Store Connect (Apple).
// A Apple rejeita qualquer imagem fora do tamanho EXATO em pixels. Os tamanhos
// aceitos hoje nos dois slots obrigatórios:
//   iPhone 6.9"  → 1320x2868  (viewport 440x956  @ DSF 3)
//   iPad 13"     → 2064x2752  (viewport 1032x1376 @ DSF 2)
// O iPad é obrigatório porque o target iOS é universal (TARGETED_DEVICE_FAMILY = "1,2").
// A partir desses dois a Apple redimensiona sozinha para os aparelhos menores.
//
// Rodar:  VITE_ENABLE_MOCK=true npx playwright test e2e/screenshots-ios.spec.ts
const OUT = path.join(process.cwd(), "screenshots", "ios");

const ALVOS = [
  {
    // Slot "iPhone com Dynamic Island (tela média)" — 6,1"/6,3" → 1206x2622
    pasta: "iphone-6.3",
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
    userAgent: devices["iPhone 15 Pro"].userAgent,
  },
  {
    pasta: "iphone-6.9",
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    userAgent: devices["iPhone 15 Pro Max"].userAgent,
  },
  {
    pasta: "ipad-13",
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
    userAgent: devices["iPad Pro 11"].userAgent,
  },
];

const ROTAS: Array<[string, string]> = [
  ["01-home", "/"],
  ["02-buscar", "/buscar"],
  ["03-favoritos", "/favoritos"],
  ["04-progresso", "/progresso"],
  ["05-perfil", "/perfil"],
  ["06-professores", "/professores"],
];

async function pronto(page: Page, espera = 1000) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(espera);
}

for (const alvo of ALVOS) {
  test.describe(alvo.pasta, () => {
    test.use({
      viewport: alvo.viewport,
      deviceScaleFactor: alvo.deviceScaleFactor,
      userAgent: alvo.userAgent,
      hasTouch: true,
      isMobile: true,
      colorScheme: "light",
      locale: "pt-BR", // o i18n do app segue o idioma do navegador
    });

    test(`captura telas para a App Store (${alvo.pasta})`, async ({ page }) => {
      test.setTimeout(180_000);
      const dir = path.join(OUT, alvo.pasta);
      fs.mkdirSync(dir, { recursive: true });

      // Favoritos do modo mock ficam no sessionStorage — sem isso a tela sai vazia
      await page.addInitScript(() => {
        sessionStorage.setItem("rasta_favorites", JSON.stringify(["v1", "v2", "v4", "v5", "v7", "v9"]));
      });

      // Garante tema light mesmo se algum profile antigo tiver 'dark' salvo
      await page.goto("/login");
      await page.evaluate(() => localStorage.setItem("rasta_theme", "light"));
      await page.reload();
      await page.fill('input[type="email"]', "aluno@rastahale.com");
      await page.fill('input[type="password"]', "rasta123");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
      await pronto(page, 1200);

      for (const [nome, rota] of ROTAS) {
        await page.goto(rota);
        await pronto(page);
        await page.screenshot({ path: path.join(dir, `${nome}.png`), fullPage: false });
        console.log(`✓ ${alvo.pasta}/${nome}.png`);
      }

      // Tela de detalhe de uma aula
      await page.goto("/video/v1");
      await pronto(page, 1200);
      await page.screenshot({ path: path.join(dir, "07-video.png"), fullPage: false });
      console.log(`✓ ${alvo.pasta}/07-video.png`);
    });
  });
}
