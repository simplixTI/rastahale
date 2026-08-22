import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Faz o botão voltar do Android navegar dentro do app em vez de fechá-lo.
 *
 * O core do Capacitor não trata o botão voltar: sem um listener, o Android
 * encerra a Activity no primeiro toque, então o usuário era jogado para fora do
 * app ao tentar voltar de uma aba para a anterior.
 *
 * Com o listener: se existe histórico, volta uma entrada; se está na primeira
 * tela, aí sim sai do app — que é o comportamento que o Android espera.
 *
 * No navegador é no-op, porque lá o botão voltar já é do próprio browser.
 */
export function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    }).then((handle) => {
      // O componente pode desmontar antes do listener registrar.
      if (cancelled) handle.remove();
      else remove = () => handle.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
