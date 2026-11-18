import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./i18n"; // registra i18next antes de qualquer componente renderizar
import "./index.css";
import "./App.css";

// App nativo: trava o zoom da página. No iOS, tocar num campo com fonte menor
// que 16px (os do login são 14px) dá zoom automático e ele NÃO volta depois —
// o app inteiro ficava ampliado, cortado na direita e fora de centro. Na web o
// zoom por pinça continua liberado (acessibilidade).
if (Capacitor.isNativePlatform()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
    );
}

// Registra o Service Worker para PWA
if ("serviceWorker" in navigator) {
  // Havia um SW controlando ANTES desta carga? Se sim, uma troca de controller
  // significa que o SW antigo (o cache-first que quebrava o F5) foi substituído
  // pelo novo — recarregamos UMA vez para pegar a versão limpa e curar o usuário.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded || !hadController) return; // evita reload no 1º registro
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => { /* SW não disponível no dev mode */ });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
