import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructors } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";

const Instructors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const { data: instructors = [], isLoading } = useInstructors();
  const { data: videos = [] }                  = useVideos(user?.id ?? "");

  const cards = instructors.map((inst) => ({
    ...inst,
    videoCount: videos.filter((v) => v.instructorId === inst.id).length,
  }));

  return (
    <MobileLayout>
      <header className="flex items-center gap-2 px-4 pt-4">
        <Users size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">{t("instructors.title")}</h1>
      </header>
      <p className="px-4 mt-1 text-xs text-muted-foreground">
        {t("instructors.subtitle")}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="mt-16 text-center">
          <Users size={32} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t("instructors.empty")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2 px-4">
          {cards.map((inst) => (
            <button
              key={inst.id}
              onClick={() => navigate(`/instrutor/${inst.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors"
            >
              <img
                src={inst.avatar}
                alt={inst.name}
                className="h-14 w-14 flex-shrink-0 rounded-full border border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{inst.name}</p>
                {inst.bio && <p className="text-[11px] text-muted-foreground truncate">{inst.bio}</p>}
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <BookOpen size={11} className="text-primary" /> {t("common.lessons", { count: inst.videoCount })}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </MobileLayout>
  );
};

export default Instructors;
