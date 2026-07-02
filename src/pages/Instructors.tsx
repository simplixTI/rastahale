import { useNavigate } from "react-router-dom";
import { BookOpen, Star, ChevronRight, Users } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructors } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import { useAllComments } from "@/hooks/useInstructorComments";

const Instructors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: instructors = [], isLoading } = useInstructors();
  const { data: videos = [] }                  = useVideos(user?.id ?? "");
  const allComments                            = useAllComments();

  const cards = instructors.map((inst) => {
    const instVids = videos.filter((v) => v.instructorId === inst.id);
    const comments = allComments.filter((c) => c.instructorId === inst.id);
    const avgRating = comments.length
      ? comments.reduce((s, c) => s + c.rating, 0) / comments.length
      : 0;
    return { ...inst, videoCount: instVids.length, avgRating, commentCount: comments.length };
  });

  return (
    <MobileLayout>
      <header className="flex items-center gap-2 px-4 pt-4">
        <Users size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">Professores</h1>
      </header>
      <p className="px-4 mt-1 text-xs text-muted-foreground">
        Explore as aulas e módulos de cada professor
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="mt-16 text-center">
          <Users size={32} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum professor cadastrado</p>
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
                    <BookOpen size={11} className="text-primary" /> {inst.videoCount} aula{inst.videoCount !== 1 ? "s" : ""}
                  </span>
                  {inst.avgRating > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                      <Star size={11} fill="currentColor" /> {inst.avgRating.toFixed(1)}
                    </span>
                  )}
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
