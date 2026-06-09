import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Star, BookOpen, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructors } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import { useAllComments } from "@/hooks/useInstructorComments";
import { cn } from "@/lib/utils";

// Pontuação de popularidade "base" por instrutor (mock global)
const BASE_POPULARITY: Record<string, number> = {
  "inst-1": 420,
  "inst-3": 310,
};

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

const InstructorRanking = () => {
  const navigate              = useNavigate();
  const { user }              = useAuth();
  const { data: instructors = [] } = useInstructors();
  const { data: allVideos = [] }   = useVideos(user?.id ?? "");
  const allComments                = useAllComments();

  const ranked = useMemo(() => {
    return instructors
      .map((inst) => {
        const videos      = allVideos.filter((v) => v.instructorId === inst.id);
        const watched     = videos.filter((v) => v.watched || (v.progress ?? 0) > 0).length;
        const base        = BASE_POPULARITY[inst.id] ?? 0;
        const comments    = allComments.filter((c) => c.instructorId === inst.id);
        const avgRating   = comments.length
          ? comments.reduce((s, c) => s + c.rating, 0) / comments.length
          : 0;
        const score       = base + watched * 15 + comments.length * 5 + avgRating * 10;
        return { ...inst, videos, watched, comments, avgRating, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [instructors, allVideos, allComments]);

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full bg-secondary p-1.5 text-muted-foreground">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <h1 className="text-sm font-bold text-foreground">Ranking de Instrutores</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5">
        {/* pódio (top 3) */}
        {ranked.length >= 3 && (
          <div className="mb-6 flex items-end justify-center gap-2">
            {/* 2º */}
            <div className="flex flex-col items-center gap-1.5">
              <img src={ranked[1].avatar} alt={ranked[1].name}
                className="h-16 w-16 rounded-full border-2 border-zinc-400 object-cover shadow-md" />
              <span className="text-lg">🥈</span>
              <p className="max-w-[70px] text-center text-[10px] font-semibold text-foreground truncate">{ranked[1].name}</p>
              <div className="h-16 w-20 rounded-t-lg bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-400">2º</span>
              </div>
            </div>
            {/* 1º */}
            <div className="flex flex-col items-center gap-1.5 -mb-0">
              <div className="relative">
                <img src={ranked[0].avatar} alt={ranked[0].name}
                  className="h-20 w-20 rounded-full border-4 border-amber-400 object-cover shadow-xl" />
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl">👑</span>
              </div>
              <span className="text-2xl">🥇</span>
              <p className="max-w-[80px] text-center text-[11px] font-bold text-foreground truncate">{ranked[0].name}</p>
              <div className="h-24 w-24 rounded-t-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-400">1º</span>
              </div>
            </div>
            {/* 3º */}
            <div className="flex flex-col items-center gap-1.5">
              <img src={ranked[2].avatar} alt={ranked[2].name}
                className="h-14 w-14 rounded-full border-2 border-amber-700 object-cover shadow-md" />
              <span className="text-lg">🥉</span>
              <p className="max-w-[65px] text-center text-[10px] font-semibold text-foreground truncate">{ranked[2].name}</p>
              <div className="h-10 w-20 rounded-t-lg bg-amber-700/20 border border-amber-700/30 flex items-center justify-center">
                <span className="text-xs font-bold text-amber-700">3º</span>
              </div>
            </div>
          </div>
        )}

        {/* lista completa */}
        <div className="space-y-3">
          {ranked.map((inst, idx) => (
            <button
              key={inst.id}
              onClick={() => navigate(`/instrutor/${inst.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors"
            >
              {/* posição */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                {idx < 3
                  ? <span className="text-xl">{MEDAL[idx]}</span>
                  : <span className="text-sm font-bold text-muted-foreground">{idx + 1}º</span>
                }
              </div>

              {/* avatar */}
              <img src={inst.avatar} alt={inst.name}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover border border-border" />

              {/* info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{inst.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <BookOpen size={10} /> {inst.videos.length} aulas
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MessageCircle size={10} /> {inst.comments.length}
                  </span>
                  {inst.avgRating > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                      <Star size={10} fill="currentColor" />
                      {inst.avgRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* seta */}
              <span className="text-[10px] font-semibold text-primary flex-shrink-0">Ver →</span>
            </button>
          ))}
        </div>

        {ranked.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Trophy size={36} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum instrutor disponível ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorRanking;
