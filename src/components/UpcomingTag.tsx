import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Selo "Em breve" sobre a capa de uma aula com liberação agendada. */
const UpcomingTag = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm",
        className
      )}
    >
      <CalendarClock size={11} aria-hidden="true" />
      {t("video.upcoming")}
    </span>
  );
};

export default UpcomingTag;
