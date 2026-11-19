import { defineConfig, devices } from "@playwright/test";

// E2E hermético: não fala com o Supabase/Firebase/Stripe reais.
//   npm run e2e:local
//
// Sobe dois servidores Vite próprios (portas diferentes do dev server de 8080,
// para não atrapalhar quem já está com `npm run dev` aberto):
//   8081 → modo demo (VITE_ENABLE_MOCK): fluxos de aluno e admin, celular e desktop.
//   8082 → modo "real" apontando para um endereço morto: prova que o app NÃO libera
//          telas protegidas sem uma sessão de verdade (nada é enviado a lugar algum).
const MOCK_PORT = 8081;
const OFFLINE_PORT = 8082;

const noBackends = {
  VITE_SUPABASE_URL: "",
  VITE_SUPABASE_ANON_KEY: "",
  VITE_SUPABASE_PUBLISHABLE_KEY: "",
  VITE_FIREBASE_API_KEY: "",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    locale: "pt-BR",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      testMatch: "**/*.mock.spec.ts",
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${MOCK_PORT}` },
    },
    {
      name: "desktop",
      testMatch: "**/*.mock.spec.ts",
      use: { viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${MOCK_PORT}` },
    },
    {
      name: "guards",
      testMatch: "**/*.offline.spec.ts",
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${OFFLINE_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${MOCK_PORT} --strictPort`,
      url: `http://localhost:${MOCK_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...noBackends, VITE_ENABLE_MOCK: "true" },
    },
    {
      command: `npx vite --port ${OFFLINE_PORT} --strictPort`,
      url: `http://localhost:${OFFLINE_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...noBackends,
        VITE_ENABLE_MOCK: "false",
        // Configurado (como em produção), mas apontando para uma porta sem ninguém.
        VITE_SUPABASE_URL: "http://127.0.0.1:9",
        VITE_SUPABASE_ANON_KEY: "chave-de-teste-offline",
      },
    },
  ],
});
