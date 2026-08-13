import { useTranslation } from "react-i18next";
import { currentLocale } from "@/i18n";

/**
 * Rótulos que vêm do banco em português (nível técnico, intervalo do plano,
 * status de pagamento) e precisam ser exibidos no idioma do aluno.
 *
 * O valor original é sempre o fallback: modalidades e planos criados pelo admin
 * são texto livre e não têm tradução — aparecem como foram cadastrados.
 */
export function useLabels() {
  const { t } = useTranslation();

  return {
    /** "Iniciante" | "Intermediário" | "Avançado" → idioma do aluno. */
    level: (level: string) => t(`level.${level}`, { defaultValue: level }),

    /** "mensal" | "trimestral" | "anual" → "por mês" / "per month" / "por mes". */
    interval: (interval: string) =>
      t(`interval.${interval}`, { defaultValue: t("interval.fallback", { interval }) }),

    /** "pago" | "pendente" | "falhou" → rótulo capitalizado no idioma do aluno. */
    payStatus: (status: string) =>
      t(`payStatus.${status}`, {
        defaultValue: status.charAt(0).toUpperCase() + status.slice(1),
      }),

    /** Formata um valor em BRL usando o locale do idioma ativo. */
    currency: (value: number) =>
      value.toLocaleString(currentLocale(), { style: "currency", currency: "BRL" }),

    /** Data curta ("12 ago 2026") no locale do idioma ativo. */
    shortDate: (dateStr: string) =>
      new Date(dateStr + "T00:00:00").toLocaleDateString(currentLocale(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),

    /** Data por extenso ("12 de agosto de 2026") no locale do idioma ativo. */
    longDate: (date: Date) =>
      date.toLocaleDateString(currentLocale(), {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),

    /** Minutos como "1h 20min" / "45min", com as unidades traduzidas. */
    duration: (minutes: number) => {
      const total = Math.round(minutes);
      if (total < 60) return t("duration.minutes", { count: total });
      const h = Math.floor(total / 60);
      const m = total % 60;
      return m > 0
        ? t("duration.hoursMinutes", { hours: h, minutes: m })
        : t("duration.hours", { count: h });
    },
  };
}
