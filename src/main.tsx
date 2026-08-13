import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n"; // registra i18next antes de qualquer componente renderizar
import "./index.css";
import "./App.css";

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
