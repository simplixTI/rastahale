import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rastahale.academy",
  appName: "RastaHale Academy",
  webDir: "dist",

  android: {
    // O app só consome HTTPS (Supabase, Vercel). Bloquear conteúdo misto evita
    // que um recurso http:// passe despercebido dentro do WebView.
    allowMixedContent: false,
  },

  server: {
    // Serve os assets como https://localhost em vez de file://. Isso mantém o
    // WebView num contexto seguro, que é o que sessionStorage/localStorage e a
    // sessão do Supabase precisam para funcionar igual à web.
    androidScheme: "https",
  },
};

export default config;
