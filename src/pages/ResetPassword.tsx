import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Extrai access_token/refresh_token do hash da URL, seja ela vinda da web
// direto (window.location.hash) ou de um deep link do Android que já
// atravessou o useDeepLinks e chegou aqui via React Router (location.hash).
// O supabase-js só processa o hash automaticamente na inicialização; quando
// o app já estava aberto e recebe o link, precisamos setar a sessão à mão.
function parseRecoveryTokens(hash: string): { accessToken: string; refreshToken: string } | null {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");
  if (accessToken && refreshToken && type === "recovery") {
    return { accessToken, refreshToken };
  }
  return null;
}

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState<null | boolean>(null);

  // Ao montar: se veio via deep link com hash de recovery, seta a sessão
  // manualmente. Se veio direto na web, o SDK já processou o hash na init.
  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      const hash = location.hash || window.location.hash;
      const tokens = parseRecoveryTokens(hash);

      if (tokens) {
        const { error: err } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (!cancelled) setSessionReady(!err);
        return;
      }

      // Sem tokens no hash: pergunta ao SDK se já existe sessão de recovery.
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSessionReady(!!data.session);
    };

    ensureSession();
    return () => { cancelled = true; };
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("resetPassword.errorShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("resetPassword.errorMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      // Encerra a sessão de recovery para forçar login com a nova senha.
      await supabase.auth.signOut({ scope: "local" });
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch {
      setError(t("resetPassword.errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-[360px]">
        <div className="flex justify-center">
          <LanguageSwitcher variant="compact" />
        </div>

        <div className="mt-5 flex justify-center">
          <Logo className="h-20 rounded-2xl" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">{t("resetPassword.title")}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{t("resetPassword.subtitle")}</p>

        {sessionReady === false && (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-200">
              {t("resetPassword.errorInvalidLink")}
            </div>
            <Link
              to="/esqueci-senha"
              className="block w-full rounded-full bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              {t("resetPassword.backToLogin")}
            </Link>
          </div>
        )}

        {sessionReady === true && !success && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("resetPassword.password")}
              </label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("resetPassword.confirm")}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {error && <p className="text-center text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-bold tracking-tight text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? t("resetPassword.submitting") : t("resetPassword.submit")}
            </button>
          </form>
        )}

        {success && (
          <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs text-emerald-200">
            {t("resetPassword.success")}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
