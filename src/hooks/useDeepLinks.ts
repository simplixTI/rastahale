// Redireciona o React Router quando o Android abre o app via App Link
// (ex: Stripe Checkout redireciona pra https://.../perfil/plano?checkout=success
// → Android abre o app → este hook lê a URL e faz o router navegar).
//
// No web/desktop o import do @capacitor/app existe mas o listener nunca dispara,
// então é seguro chamar em qualquer plataforma.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { toInternalPath } from "@/lib/deepLink";

export function useDeepLinks(): void {
  const navigate = useNavigate();

  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        // Ao clicar num link do domínio quando o app já está aberto/no bg
        const listener = await CapacitorApp.addListener("appUrlOpen", (event) => {
          // toInternalPath garante que o destino é uma rota do app (nunca "//host").
          const path = toInternalPath(event.url);
          if (path) navigate(path, { replace: false });
          else console.warn("[useDeepLinks] URL ignorada:", event.url);
        });
        if (cancelled) listener.remove();
        else handle = listener;
      } catch {
        // Plataforma web sem plugin nativo: ignora silenciosamente.
      }
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);
}
