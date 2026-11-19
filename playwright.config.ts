import { defineConfig } from "@playwright/test";

// Configuração standalone do Playwright (sem pacotes externos do Lovable).
// Sobe o dev server do Vite automaticamente antes de rodar os testes.
export default defineConfig({
  testDir: "./e2e",
  // Os specs *.mock / *.offline têm configuração própria: npm run e2e:local.
  testIgnore: ["**/*.mock.spec.ts", "**/*.offline.spec.ts"],
  use: {
    baseURL: "http://localhost:8080",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
