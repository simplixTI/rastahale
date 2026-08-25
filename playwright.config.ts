import { defineConfig } from "@playwright/test";

// Configuração standalone do Playwright (sem pacotes externos do Lovable).
// Sobe o dev server do Vite automaticamente antes de rodar os testes.
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:8080",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
