import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronRight, Clock, LayoutList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import { formatMinutes, totalMinutes } from "@/lib/duration";
import { getCategoryLabel } from "@/data/mockData";

const AthleteModules = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: instructor, isLoading: loadInst }     = useInstructor(id ?? "");
  const { data: allVideos = [], isLoading: loadVid }  = useVideos(user?.id ?? "");

  const videos = allVideos.filter((v) => v.instructorId === id);

  // Módulo = subcategoria das aulas do atleta (gerenciável em /admin/modulos).
  const modules = Object.values(
    videos.reduce<Record<string, { name: string; videos: typeof videos }>>((acc, v) => {
      if (!acc[v.subcategory]) acc[v.subcategory] = { name: v.subcategory, videos: [] };
      acc[v.subcategory].videos.push(v);
      return acc;
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (loadInst || loadVid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Atleta não encontrado</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary">Voltar</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* hero */}
      <div className="relative">
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
              {instructor.bio && (
                <p className="mt-1 px-4 text-xs leading-relaxed text-muted-foreground">{instructor.bio}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen size={12} className="text-primary" />
                {videos.length} aula{videos.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <LayoutList size={12} className="text-primary" />
                {modules.length} módulo{modules.length !== 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={() => navigate(`/instrutor/${instructor.id}`)}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Ver perfil completo
            </button>
          </div>
        </div>
      </div>

      {/* módulos */}
      <div className="px-4">
        <div className="mb-3 flex items-center gap-2">
          <LayoutList size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">Módulos</h2>
        </div>

        {modules.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <LayoutList size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum módulo disponível ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((mod) => {
              const cover    = mod.videos[0]?.thumbnail;
              const minutes  = totalMinutes(mod.videos.map((v) => v.duration));
              const category = getCategoryLabel(mod.videos[0]?.category ?? "");
              return (
                <button
                  key={mod.name}
                  onClick={() => navigate(`/atleta/${instructor.id}/modulo/${encodeURIComponent(mod.name)}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={mod.name}
                      className="h-14 w-20 flex-shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{mod.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{category}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} className="text-primary" />
                        {mod.videos.length} aula{mod.videos.length !== 1 ? "s" : ""}
                      </span>
                      {minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-primary" />
                          {formatMinutes(minutes)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteModules;
