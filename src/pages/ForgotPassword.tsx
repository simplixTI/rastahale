import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // O redirect volta pro app via App Links no Android e URL normal na web.
      const redirectTo = `${window.location.origin}/reset-senha`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) throw err;
      setSent(true);
    } catch {
      setError(t("forgotPassword.errorGeneric"));
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

        <h1 className="mt-6 text-center text-2xl font-bold text-foreground">{t("forgotPassword.title")}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{t("forgotPassword.subtitle")}</p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs text-emerald-200">
              {t("forgotPassword.success")}
            </div>
            <Link
              to="/login"
              className="block w-full rounded-full bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("forgotPassword.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
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
              {isLoading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
            </button>

            <Link
              to="/login"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
