/**
 * Sobe o app no seu computador em MODO DEMONSTRAÇÃO:
 *   npm run dev:demo      →  http://localhost:8080
 *
 * Nada aqui toca no Supabase, no Stripe ou no Firebase de verdade: o app usa os
 * dados de exemplo e dois logins de teste (os mesmos do CLAUDE.md):
 *   aluno@rastahale.com / rasta123      (área do aluno)
 *   admin@rastahale.com / admin123      (painel de administração)
 *
 * Diferente de `npm run dev`, que lê o seu .env e conversa com o banco REAL.
 * Funciona igual no Windows, Mac e Linux (as variáveis são passadas pelo Node).
 */
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  VITE_ENABLE_MOCK: "true",
  // Vazio de propósito: variáveis do ambiente têm prioridade sobre o arquivo .env.
  VITE_SUPABASE_URL: "",
  VITE_SUPABASE_ANON_KEY: "",
  VITE_SUPABASE_PUBLISHABLE_KEY: "",
  VITE_FIREBASE_API_KEY: "",
};

console.log("\n  Modo demonstração — sem backend real.");
console.log("  Aluno: aluno@rastahale.com / rasta123");
console.log("  Admin: admin@rastahale.com / admin123\n");

const server = spawn("npx", ["vite", "--port", "8080"], { stdio: "inherit", env, shell: true });
server.on("exit", (code) => process.exit(code ?? 0));
