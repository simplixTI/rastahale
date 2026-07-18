import { useEffect, useRef, useState, ReactNode } from "react";
import { Play, Trophy, Star, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import AthleteCard from "@/components/AthleteCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { useInstructors } from "@/hooks/useInstructors";
import { useAllComments } from "@/hooks/useInstructorComments";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const FadeInSection = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const Section = ({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) => (
  <FadeInSection delay={delay}>
    <section className="mt-6">
      <h2 className="mb-3 px-4 text-base font-bold text-foreground">{title}</h2>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", overflowX: "scroll" }}
      >
        {children}
        <div className="shrink-0 w-1" aria-hidden="true" />
      </div>
    </section>
  </FadeInSection>
);

const BASE_POP: Record<string, number> = { "inst-1": 420, "inst-3": 310 };

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: videos = [], isLoading }      = useVideos(user?.id ?? "");
  const { data: instructors = [] }            = useInstructors();
  const allComments                           = useAllComments();

  const featured         = videos.find((v) => v.id === "v5") ?? videos[0];
  const continueWatching = videos.filter((v) => v.progress && v.progress > 0 && v.progress < 100);

  // Atletas do carrossel: quem tem pelo menos uma aula publicada.
  const athletes = instructors
    .map((inst) => {
      const instVids  = videos.filter((v) => v.instructorId === inst.id);
      const comments  = allComments.filter((c) => c.instructorId === inst.id);
      const avgRating = comments.length ? comments.reduce((s, c) => s + c.rating, 0) / comments.length : 0;
      return { ...inst, videoCount: instVids.length, avgRating };
    })
    .filter((a) => a.videoCount > 0);

  const rankedInstructors = instructors
    .map((inst) => {
      const instVids  = videos.filter((v) => v.instructorId === inst.id);
      const watched   = instVids.filter((v) => v.watched || (v.progress ?? 0) > 0).length;
      const comments  = allComments.filter((c) => c.instructorId === inst.id);
      const avgRating = comments.length ? comments.reduce((s, c) => s + c.rating, 0) / comments.length : 0;
      const score     = (BASE_POP[inst.id] ?? 0) + watched * 15 + comments.length * 5 + avgRating * 10;
      return { ...inst, score, avgRating, videoCount: instVids.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <FadeInSection>
        <header className="flex items-center justify-between px-4 pt-4">
          <img src={logo} alt="RastaHale" className="h-10 rounded-lg" />
          <span className="text-xs font-medium text-muted-foreground">Olá, {user?.name?.split(" ")[0] ?? "Atleta"} 🤙</span>
        </header>
      </FadeInSection>

      {featured && (
        <FadeInSection delay={100}>
          <button
            onClick={() => navigate(`/video/${featured.id}`)}
            className="group relative mx-4 mt-4 overflow-hidden rounded-xl"
          >
            <img
              src={featured.thumbnail}
              alt={featured.title}
              className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="mb-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                EM DESTAQUE
              </span>
              <h1 className="text-lg font-bold leading-tight text-primary-foreground">{featured.title}</h1>
              <p className="mt-0.5 text-xs text-primary-foreground/70">{featured.duration}</p>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-primary p-3 shadow-lg">
              <Play size={20} className="text-primary-foreground" fill="currentColor" />
            </div>
          </button>
        </FadeInSection>
      )}

      {continueWatching.length > 0 && (
        <Section title="Continuar Assistindo" delay={200}>
          {continueWatching.map((v) => (
            <VideoCard key={v.id} video={v} size="sm" />
          ))}
        </Section>
      )}

      {/* Carrossel de atletas — clicar abre os módulos do professor */}
      {athletes.length > 0 && (
        <FadeInSection delay={100}>
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="text-base font-bold text-foreground">Nossos Atletas</h2>
              <button
                onClick={() => navigate("/professores")}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary"
              >
                Ver todos <ChevronRight size={12} />
              </button>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", overflowX: "scroll" }}
            >
              {athletes.map((a) => (
                <AthleteCard key={a.id} athlete={a} />
              ))}
              <div className="shrink-0 w-1" aria-hidden="true" />
            </div>
          </section>
        </FadeInSection>
      )}

      {/* Top Instrutores */}
      {rankedInstructors.length > 0 && (
        <FadeInSection delay={150}>
          <section className="mt-6 px-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-400" />
                <h2 className="text-base font-bold text-foreground">Top Instrutores</h2>
              </div>
              <button onClick={() => navigate("/ranking")}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                Ver ranking <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {rankedInstructors.map((inst, idx) => (
                <button key={inst.id} onClick={() => navigate(`/instrutor/${inst.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors">
                  <span className="w-5 flex-shrink-0 text-center text-sm font-bold text-muted-foreground">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                  </span>
                  <img src={inst.avatar} alt={inst.name}
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{inst.name}</p>
                    <p className="text-[10px] text-muted-foreground">{inst.videoCount} aulas</p>
                  </div>
                  {inst.avgRating > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-400 flex-shrink-0">
                      <Star size={11} fill="currentColor" /> {inst.avgRating.toFixed(1)}
                    </span>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </FadeInSection>
      )}
    </MobileLayout>
  );
};

export default Index;
