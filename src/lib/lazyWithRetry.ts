import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "rasta_chunk_reload";

/**
 * `React.lazy` que sobrevive a um deploy novo.
 *
 * Os arquivos da Vite têm hash no nome. Quem está com o app aberto durante um
 * deploy pede um chunk que não existe mais ("Failed to fetch dynamically
 * imported module") e a tela quebra. Na primeira falha recarregamos a página
 * uma vez para pegar o `index.html` novo; se falhar de novo (rede caída de
 * verdade), o erro segue para o RouteErrorBoundary em vez de entrar em loop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* sem storage */ }
      return mod;
    } catch (error) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch { /* sem storage: tenta uma vez e segue */ }

      if (!alreadyReloaded) {
        window.location.reload();
        // A página vai recarregar: nunca resolve, para não renderizar nada no meio.
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
