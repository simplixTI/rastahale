import { useEffect, useRef, useState, ReactNode } from "react";
import { Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import AthleteCard from "@/components/AthleteCard";
import TopicSections from "@/components/TopicSections";
import StoreBanner from "@/components/StoreBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { useInstructors } from "@/hooks/useInstructors";
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

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: videos = [], isLoading }      = useVideos(user?.id ?? "");
  const { data: instructors = [] }            = useInstructors();

  const featured         = videos.find((v) => v.id === "v5") ?? videos[0];
  // Aulas começadas e ainda não terminadas.
  const continueWatching = videos.filter(
    (v) => !v.watched && (v.progress ?? 0) > 0 && (v.progress ?? 0) < 100
  );

  // Carrossel com todos os atletas cadastrados (inclusive os que ainda não têm
  // aula) — quem tem mais aulas aparece primeiro.
  const athletes = instructors
    .map((inst) => ({
      ...inst,
      videoCount: videos.filter((v) => v.instructorId === inst.id).length,
    }))
    .sort((a, b) => b.videoCount - a.videoCount);

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

      {/* Tópicos por posição (Passagem de Guarda, Finalizações, etc.) — geridos
          no admin via Vídeos → Módulos, agrupados aqui por subcategoria. */}
      <TopicSections />

      {/* Loja */}
      <FadeInSection delay={100}>
        <StoreBanner />
      </FadeInSection>

    </MobileLayout>
  );
};

export default Index;
