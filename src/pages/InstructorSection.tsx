import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import VideoCard from "@/components/VideoCard";
import { getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";

const InstructorSection = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const { data: instructor, isLoading: loadingInst } = useInstructor(id ?? "");
  const { data: allVideos = [], isLoading: loadingVids } = useVideos(user?.id ?? "");

  const videos = allVideos.filter((v) => v.instructorId === id);

  // Agrupar por subcategoria
  const grouped = videos.reduce<Record<string, typeof videos>>((acc, v) => {
    if (!acc[v.subcategory]) acc[v.subcategory] = [];
    acc[v.subcategory].push(v);
    return acc;
  }, {});

  const totalMinutes = videos.reduce((s, v) => {
    const [min = 0, sec = 0] = v.duration.split(":").map(Number);
    return s + min + sec / 60;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainMin  = Math.round(totalMinutes % 60);

  const isLoading = loadingInst || loadingVids;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Instrutor não encontrado</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary">Voltar</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* hero */}
      <div className="relative">
        {/* fundo desfocado */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl"
          style={{ backgroundImage: `url(${instructor.avatar})` }}
        />
        <div className="relative px-4 pb-6 pt-14">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <img
              src={instructor.avatar}
              alt={instructor.name}
              className="h-24 w-24 rounded-full border-4 border-primary object-cover shadow-xl"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">{instructor.name}</h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground px-4">{instructor.bio}</p>
            </div>

            {/* stats */}
            <div className="mt-1 flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen size={12} className="text-primary" />
                <span>{videos.length} aula{videos.length !== 1 ? "s" : ""}</span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} className="text-primary" />
                  <span>
                    {totalHours > 0 ? `${totalHours}h ` : ""}{remainMin}min
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* conteúdo */}
      <div className="px-4 pt-2">
        {videos.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <Play size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma aula disponível ainda</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catVids]) => (
            <div key={cat} className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">{cat}</h2>
                <span className="text-[10px] text-muted-foreground">{catVids.length} aula{catVids.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {catVids.map((v) => (
                  <VideoCard key={v.id} video={v} size="sm" />
                ))}
              </div>
            </div>
          ))
        )}

        {/* todas as aulas (lista compacta) */}
        {videos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-foreground">Todas as aulas</h2>
            <div className="space-y-2">
              {videos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/video/${v.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play size={14} className="text-white" fill="currentColor" />
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{v.duration}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{getCategoryLabel(v.category)} · {v.subcategory}</p>
                    <span className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      v.level === "Iniciante"    ? "bg-emerald-500/20 text-emerald-400" :
                      v.level === "Intermediário" ? "bg-amber-500/20 text-amber-400" :
                                                   "bg-red-500/20 text-red-400"
                    )}>
                      {v.level}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorSection;
