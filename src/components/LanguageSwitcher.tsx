import { useTranslation } from "react-i18next";
import { changeLanguage, currentLanguage, LANGUAGES, type Language } from "@/i18n";
import { cn } from "@/lib/utils";

/** Bandeira de cada idioma — reforço visual para quem não lê o nome. */
const FLAGS: Record<Language, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

/**
 * Seletor de idioma. `variant="pills"` para dentro de listas de configuração;
 * `variant="compact"` para cantos apertados (topo do login), onde só cabem as
 * bandeiras.
 */
const LanguageSwitcher = ({ variant = "pills" }: { variant?: "pills" | "compact" }) => {
  const { t } = useTranslation();
  const active = currentLanguage();

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
        {LANGUAGES.map((lng) => (
          <button
            key={lng}
            onClick={() => changeLanguage(lng)}
            aria-label={t(`lang.${lng}`)}
            aria-pressed={lng === active}
            className={cn(
              "rounded-full px-2 py-1 text-sm leading-none transition-colors",
              lng === active ? "bg-primary/15 opacity-100" : "opacity-50 hover:opacity-80"
            )}
          >
            {FLAGS[lng]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          onClick={() => changeLanguage(lng)}
          aria-pressed={lng === active}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
            lng === active
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          )}
        >
          <span aria-hidden="true">{FLAGS[lng]}</span>
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
