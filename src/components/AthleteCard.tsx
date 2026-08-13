import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";

export interface AthleteCardData {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  videoCount: number;
}

const AthleteCard = ({ athlete }: { athlete: AthleteCardData }) => {
  const navigate = useNavigate();
  const { t }    = useTranslation();

  return (
    <button
      onClick={() => navigate(`/atleta/${athlete.id}`)}
      className="group w-40 min-w-[160px] flex-shrink-0 snap-start text-left transition-transform duration-300 ease-out hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 shadow-md transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
        <img
          src={athlete.avatar}
          alt={athlete.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="truncate text-sm font-bold leading-tight text-primary-foreground">{athlete.name}</p>
          {athlete.bio && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-primary-foreground/70">{athlete.bio}</p>
          )}
          <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary-foreground/90">
            <BookOpen size={10} className="text-primary" />
            {t("common.lessons", { count: athlete.videoCount })}
          </span>
        </div>
      </div>
    </button>
  );
};

export default AthleteCard;
