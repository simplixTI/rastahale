import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { authProvider, isMockModeEnabled, isFirebaseConfigured, isAnyAuthConfigured, AuthError } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import { Eye, EyeOff, Download, X, Smartphone } from "lucide-react";

const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Netflix "ta-dum" style sound — short base64 encoded sine wave burst
const playNetflixSound = () => {
  if (prefersReducedMotion()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // First note
    osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);

    // Second deeper note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(146.83, ctx.currentTime + 0.15); // D3
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc2.start(ctx.currentTime + 0.15);

    // Third chord
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.setValueAtTime(220, ctx.currentTime + 0.15); // A3
    gain3.gain.setValueAtTime(0, ctx.currentTime);
    gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc3.start(ctx.currentTime + 0.15);

    setTimeout(() => {
      osc.stop();
      osc2.stop();
      osc3.stop();
      ctx.close();
    }, 2000);
  } catch {
    // Audio not available
  }
};

/** Evento `beforeinstallprompt` do Chrome — ainda não está no lib.dom padrão. */
interface InstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type ErrorKey =
  | ""
  | "errorCredentials"
  | "errorNetwork"
  | "errorPopupClosed"
  | "errorProvider"
  | "errorTooManyRequests"
  | "errorEmailNotConfirmed";

const isDevOrMock =
  import.meta.env.DEV || isMockModeEnabled;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Guardamos a chave do erro, não o texto: assim a mensagem acompanha uma
  // troca de idioma feita depois que o erro já apareceu.
  const [errorKey, setErrorKey] = useState<ErrorKey>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
      setShowInstallPopup(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
    setShowInstallPopup(false);
  };

  const finishLogin = (role: "user" | "admin" | "instructor") => {
    setShowSplash(true);
    playNetflixSound();
    redirectTimeoutRef.current = setTimeout(() => {
      navigate(role === "admin" ? "/admin" : role === "instructor" ? "/studio" : "/");
    }, 2200);
  };

  const mapError = (err: unknown): ErrorKey => {
    if (err instanceof AuthError) {
      switch (err.type) {
        case "popup_closed":
          return "errorPopupClosed";
        case "too_many_requests":
          return "errorTooManyRequests";
        case "email_not_confirmed":
          return "errorEmailNotConfirmed";
        case "network_error":
          return "errorNetwork";
        case "provider_error":
          return "errorProvider";
        default:
          return "errorCredentials";
      }
    }
    return "errorNetwork";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey("");
    setIsLoading(true);

    try {
      const role = await login(email, password);
      if (role) {
        finishLogin(role);
      } else {
        setErrorKey("errorCredentials");
      }
    } catch (err) {
      setErrorKey(mapError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorKey("");
    setIsGoogleLoading(true);
    try {
      const { user } = await authProvider.signInWithGoogle();
      if (user?.role) {
        finishLogin(user.role);
      } else {
        setErrorKey("errorProvider");
      }
    } catch (err) {
      setErrorKey(mapError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setErrorKey("");
    setIsAppleLoading(true);
    try {
      const { user } = await authProvider.signInWithApple();
      if (user?.role) {
        finishLogin(user.role);
      } else {
        setErrorKey("errorProvider");
      }
    } catch (err) {
      setErrorKey(mapError(err));
    } finally {
      setIsAppleLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo className="h-24 rounded-2xl shadow-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* PWA Install Popup */}
      {showInstallPopup && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-[360px] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setShowInstallPopup(false)}
            aria-label={t("login.closeInstall")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t("login.installTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("login.installSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full btn-press bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download size={15} />
            {t("login.installNow")}
          </button>
        </div>
      )}

      {/* Floating install button (when popup is dismissed) */}
      {installPrompt && !showInstallPopup && (
        <button
          onClick={() => setShowInstallPopup(true)}
          className="fixed bottom-6 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Download size={14} />
          {t("login.install")}
        </button>
      )}
      <div className="w-full max-w-[360px]">
        {/* Seletor de idioma antes do formulário — quem não lê português
            precisa poder trocar sem entrar no app. */}
        <div className="flex justify-center">
          <LanguageSwitcher variant="compact" />
        </div>

        <div className="mt-5 flex justify-center">
          <Logo className="h-20 rounded-2xl" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">{t("login.title")}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{t("login.subtitle")}</p>

        {!isAnyAuthConfigured && !isMockModeEnabled && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-200">
            {t("login.notConfigured")}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("login.password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {errorKey && <p className="text-center text-xs text-red-400">{t(`login.${errorKey}`)}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary py-3.5 text-sm font-bold tracking-tight text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        {!isMockModeEnabled && isFirebaseConfigured && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t("login.or")}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isGoogleLoading ? t("login.submitting") : t("login.google")}
            </button>

            {/* Sign in with Apple — obrigatório na App Store (guideline 4.8).
                Estilo preto fixo seguindo o HIG da Apple, nos dois temas. */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={isAppleLoading || isLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-black py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.86-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.82 3.24-.74 1.13.09 2.11.54 2.87 1.47-2.63 1.58-2.19 5.03.45 6.04-.5 1.32-1.15 2.63-2.14 3.66l-.5.74zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              {isAppleLoading ? t("login.submitting") : t("login.apple")}
            </button>
          </>
        )}

        {/* Test credentials — apenas em dev ou modo mock explícito */}
        {isDevOrMock && (
          <div className="mt-8 rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("login.testCredentials")}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setEmail("aluno@rastahale.com"); setPassword("rasta123"); }}
                className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-left text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">👤 {t("login.roleStudent")}</span>
                  <span className="ml-2 text-muted-foreground">aluno@rastahale.com</span>
                </div>
                <span className="text-muted-foreground">rasta123</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail("admin@rastahale.com"); setPassword("admin123"); }}
                className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-left text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">🔑 {t("login.roleAdmin")}</span>
                  <span className="ml-2 text-muted-foreground">admin@rastahale.com</span>
                </div>
                <span className="text-muted-foreground">admin123</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
