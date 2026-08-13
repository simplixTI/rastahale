import { Flame, Clock, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import MobileLayout from "@/components/MobileLayout";
import StudentRanking from "@/components/StudentRanking";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { useProfile } from "@/hooks/useProfile";
import { useOverallProgress } from "@/hooks/useProgress";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const badges = [
  { emoji: "🥋", titleKey: "progress.badgeJiuJitsu",  key: "jj"     },
  { emoji: "🤼", titleKey: "progress.badgeLutaLivre", key: "ll"     },
  { emoji: "🔟", titleKey: "progress.badgeTen",       key: "ten"    },
  { emoji: "🏆", titleKey: "progress.badgeMaster",    key: "master" },
];

const ProgressPage = () => {
  const { user } = useAuth();
  const { t }    = useTranslation();
  const { data: videos = [], isLoading } = useVideos(user?.id ?? "");
  const { data: profile } = useProfile(user?.id ?? "");
  const { data: overallProgress = 0 } = useOverallProgress(user?.id ?? "");

  const inProgressVideos = videos.filter((v) => v.progress && v.progress > 0 && v.progress < 100);
  const watchedJJ = videos.some((v) => v.category === "jiu-jitsu" && v.watched);
  const watchedLL = videos.some((v) => v.category === "luta-livre" && v.watched);
  const watchedCount = profile?.videosWatched ?? 0;

  const badgeUnlocked = {
    jj: watchedJJ,
    ll: watchedLL,
    ten: watchedCount >= 10,
    master: watchedCount >= 20,
  };

  const stats = [
    { icon: BookOpen, label: t("progress.statLessons"), value: `${watchedCount}` },
    { icon: Clock,    label: t("progress.statHours"),   value: `${profile?.totalHours ?? 0}h` },
    { icon: Flame,    label: t("progress.statOverall"), value: `${overallProgress}%` },
  ];

  return (
    <MobileLayout>
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-foreground">{t("progress.title")}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("progress.subtitle")}</p>
      </header>

      {/* Ranking dos alunos (gamificação por faixas) */}
      <StudentRanking />

      <div className="mt-8 flex items-center gap-1.5 px-4">
        <Flame size={16} className="text-primary" />
        <h2 className="text-base font-bold text-foreground">{t("progress.myProgress")}</h2>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
            <Icon size={20} className="text-primary" />
            <span className="mt-1 text-lg font-bold text-foreground">{value}</span>
            <span className="text-[10px] text-muted-foreground text-center">{label}</span>
          </div>
        ))}
      </div>

      <section className="mt-6 px-4">
        <h2 className="text-sm font-bold text-foreground">{t("progress.inProgress")}</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inProgressVideos.length > 0 ? (
          <div className="mt-3 space-y-3">
            {inProgressVideos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <img src={v.thumbnail} alt={v.title} className="h-14 w-20 flex-shrink-0 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{v.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={v.progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-medium text-muted-foreground">{v.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{t("progress.noneInProgress")}</p>
        )}
      </section>

      <section className="mt-6 px-4">
        <h2 className="text-sm font-bold text-foreground">{t("progress.achievements")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.key}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3",
                badgeUnlocked[b.key as keyof typeof badgeUnlocked]
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card opacity-50"
              )}
            >
              <span className="text-2xl">{b.emoji}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight">{t(b.titleKey)}</span>
            </div>
          ))}
        </div>
      </section>
    </MobileLayout>
  );
};

export default ProgressPage;
