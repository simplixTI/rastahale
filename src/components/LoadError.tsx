import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Falha ao carregar do Supabase: diz o que houve em vez de mostrar uma tela vazia. */
export default function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <WifiOff size={32} className="text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
      <button
        onClick={onRetry}
        className="rounded-full btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
