import { useMemo } from "react";
import { Trophy, Star, BookOpen, MessageCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructors } from "@/hooks/useInstructors";
import { useAdminVideos } from "@/hooks/useAdminData";
import { useAllComments, useInstructorComments } from "@/hooks/useInstructorComments";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const BASE_POP: Record<string, number> = { "inst-1": 420, "inst-3": 310 };

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

const StudioRanking = () => {
  const { user }                         = useAuth();
  const { data: instructors = [] }       = useInstructors();
  const { data: allVideos = [] }         = useAdminVideos();
  const allComments                      = useAllComments();
  const { comments, avgRating }          = useInstructorComments(user?.id ?? "");

  const myVideos = allVideos.filter((v) => v.instructorId === user?.id);

  const ranked = useMemo(() => {
    return instructors
      .map((inst) => {
        const vids     = allVideos.filter((v) => v.instructorId === inst.id);
        const comms    = allComments.filter((c) => c.instructorId === inst.id);
        const avg      = comms.length ? comms.reduce((s, c) => s + c.rating, 0) / comms.length : 0;
        const score    = (BASE_POP[inst.id] ?? 0) + vids.length * 15 + comms.length * 5 + avg * 10;
        return { ...inst, vids, comms, avg, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [instructors, allVideos, allComments]);

  const myPosition = ranked.findIndex((i) => i.id === user?.id) + 1;
  const myData     = ranked.find((i) => i.id === user?.id);

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
          <div>
            <p className="text-xs font-bold text-foreground leading-none">Seu ranking</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* minha posição — card de destaque */}
        <div className={cn(
          "rounded-xl border p-4",
          myPosition === 1 ? "border-amber-500/40 bg-amber-500/10" :
          myPosition === 2 ? "border-zinc-400/40 bg-zinc-400/10" :
          myPosition === 3 ? "border-amber-700/40 bg-amber-700/10" :
          "border-primary/30 bg-primary/5"
        )}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl font-black",
                myPosition === 1 ? "border-amber-400 bg-amber-500/20 text-amber-400" :
                myPosition === 2 ? "border-zinc-400 bg-zinc-400/20 text-zinc-300" :
                myPosition === 3 ? "border-amber-700 bg-amber-700/20 text-amber-600" :
                "border-primary bg-primary/20 text-primary"
              )}>
                {myPosition <= 3 ? MEDAL[myPosition - 1] : `${myPosition}º`}
              </div>
              <p className="mt-1 text-[9px] text-muted-foreground">posição</p>
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {myPosition === 1 ? "🏆 Você está no topo!" :
                 myPosition === 2 ? "🥈 Quase lá!" :
                 myPosition === 3 ? "🥉 Top 3!" :
                 `Posição ${myPosition} de ${ranked.length}`}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">{myVideos.length}</p>
                  <p className="text-[9px] text-muted-foreground">Aulas</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">{comments.length}</p>
                  <p className="text-[9px] text-muted-foreground">Avaliações</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground">
                    {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Nota</p>
                </div>
              </div>
            </div>
          </div>

          {myPosition > 1 && myData && ranked[myPosition - 2] && (
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUp size={11} className="text-primary" />
                Para subir para {myPosition - 1}º precisaria superar{" "}
                <span className="font-semibold text-foreground">{ranked[myPosition - 2].name}</span>
              </p>
            </div>
          )}
        </div>

        {/* ranking completo */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Trophy size={14} className="text-amber-400" /> Ranking completo
          </h2>

          <div className="space-y-2">
            {ranked.map((inst, idx) => {
              const isMe = inst.id === user?.id;
              return (
                <div key={inst.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    isMe
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card"
                  )}>
                  {/* posição */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                    {idx < 3
                      ? <span className="text-xl">{MEDAL[idx]}</span>
                      : <span className="text-sm font-bold text-muted-foreground">{idx + 1}º</span>
                    }
                  </div>

                  {/* avatar */}
                  <img src={inst.avatar} alt={inst.name}
                    className={cn(
                      "h-11 w-11 flex-shrink-0 rounded-full object-cover border-2",
                      isMe ? "border-primary" : "border-border"
                    )}
                  />

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-xs font-bold truncate", isMe ? "text-primary" : "text-foreground")}>
                        {inst.name}
                      </p>
                      {isMe && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground flex-shrink-0">
                          VOCÊ
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <BookOpen size={9} /> {inst.vids.length}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MessageCircle size={9} /> {inst.comms.length}
                      </span>
                      {inst.avg > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                          <Star size={9} fill="currentColor" /> {inst.avg.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioRanking;
