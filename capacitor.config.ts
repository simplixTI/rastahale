import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rastahale.academy",
  appName: "RastaHale Academy",
  webDir: "dist",

  // "production" força Logger.error dos plugins a escrever no logcat mesmo em
  // release. Útil pra diagnosticar erros de sign-in via `adb logcat` sem
  // precisar de build debuggable.
  loggingBehavior: "production",

  android: {
    // O app só consome HTTPS (Supabase, Vercel). Bloquear conteúdo misto evita
    // que um recurso http:// passe despercebido dentro do WebView.
    allowMixedContent: false,
  },

  plugins: {
    SystemBars: {
      // "LIGHT" = barras com CONTEUDO escuro (icones pretos), para fundo claro —
      // tema padrao do app agora e o claro. Ao trocar de tema em runtime, o
      // useTheme chama SystemBars.setStyle() e sobrepoe este default.
      style: "LIGHT",
    },
    // O plugin @capacitor-firebase/authentication exige a lista explicita de
    // providers habilitados. Sem isso o signInWithGoogle rejeita com
    // "Google sign-in provider is not enabled".
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "apple.com"],
    },
  },

  server: {
    // Serve os assets como https://localhost em vez de file://. Isso mantém o
    // WebView num contexto seguro, que é o que sessionStorage/localStorage e a
    // sessão do Supabase precisam para funcionar igual à web.
    androidScheme: "https",
  },
};

export default config;
