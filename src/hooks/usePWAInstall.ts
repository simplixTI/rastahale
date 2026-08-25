import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [isAndroid,      setIsAndroid]      = useState(false);
  const [isSafari,       setIsSafari]       = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const ios     = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    const safari  = /safari/.test(ua) && !/chrome/.test(ua);

    setIsIOS(ios);
    setIsAndroid(android);
    setIsSafari(safari);

    // Já está instalado (rodando como standalone)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  return {
    canInstall:    !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    install,
  };
}
