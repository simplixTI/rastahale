import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import { useLabels } from "@/i18n/labels";
import { totalMinutes } from "@/lib/duration";
import { getLevelColor } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const AthleteModuleLessons = () => {
  const { id, modulo } = useParams<{ id: string; modulo: string }>();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const { t }          = useTranslation();
  const labels         = useLabels();

  const moduleName = decodeURIComponent(modulo ?? "");

  const { data: instructor, isLoading: loadInst }    = useInstructor(id ?? "");
  const { data: allVideos = [], isLoading: loadVid } = useVideos(user?.id ?? "");

  const videos  = allVideos.filter((v) => v.instructorId === id && v.subcategory === moduleName);
  const minutes = totalMinutes(videos.map((v) => v.duration));

  if (loadInst || loadVid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-border bg-card p-2 text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{moduleName}</h1>
          {instructor && (
            <p className="truncate text-[11px] text-muted-foreground">{t("moduleLessons.with", { name: instructor.name })}</p>
          )}
        </div>
      </header>

      <div className="mt-2 flex items-center gap-4 px-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen size={11} className="text-primary" />
          {t("common.lessons", { count: videos.length })}
        </span>
        {minutes > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-primary" />
            {labels.duration(minutes)}
          </span>
        )}
      </div>

      {/* aulas */}
      <div className="mt-4 px-4">
        {videos.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <Play size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("moduleLessons.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => navigate(`/video/${v.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30"
              >
                <span className="w-4 flex-shrink-0 text-center text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play size={14} className="text-white" fill="currentColor" />
                  </div>
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">
                    {v.duration}
                  </span>
                  {v.progress !== undefined && v.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0">
                      <Progress value={v.progress} className="h-1 rounded-none bg-muted/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{v.title}</p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      getLevelColor(v.level)
                    )}
                  >
                    {labels.level(v.level)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteModuleLessons;
