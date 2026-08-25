import { useEffect, useRef, useState, ReactNode } from "react";
import { Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import AthleteCard from "@/components/AthleteCard";
import TopicSections from "@/components/TopicSections";
import StoreBanner from "@/components/StoreBanner";
import { Pill } from "@/components/Pill";
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
      <h2 className="mb-3 px-4 text-base font-bold tracking-tight text-foreground">{title}</h2>
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
  const { t }    = useTranslation();
  const { data: videos = [], isLoading }      = useVideos(user?.id ?? "");
  const { data: instructors = [] }            = useInstructors();

  const firstName        = user?.name?.split(" ")[0] ?? t("home.fallbackName");
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
        <header className="flex items-center justify-between px-4 pt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{t("home.welcome")}</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground">
              {firstName} <span className="align-middle">🤙</span>
            </h1>
          </div>
          <img
            src={logo}
            alt="RastaHale"
            className="h-11 w-auto shrink-0 object-contain"
          />
        </header>
      </FadeInSection>

      {featured && (
        <FadeInSection delay={100}>
          <button
            onClick={() => navigate(`/video/${featured.id}`)}
            className="group relative mx-4 mt-5 block w-[calc(100%-2rem)] overflow-hidden rounded-3xl"
          >
            <img
              src={featured.thumbnail}
              alt={featured.title}
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            <Pill color="primary" className="absolute left-4 top-4 shadow-lg shadow-black/25">
              {t("home.featured")}
            </Pill>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-left">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold leading-tight tracking-tight text-white">{featured.title}</h2>
                <p className="mt-1 text-xs font-medium text-white/60">{featured.duration}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md transition-all duration-300 group-hover:border-primary group-hover:bg-primary">
                <Play size={18} className="ml-0.5 text-white" fill="currentColor" />
              </div>
            </div>
          </button>
        </FadeInSection>
      )}

      {/* Loja — carrossel de fotos (gerido no admin em Painel → Banner da Loja).
          Posicionado logo abaixo do destaque para ganhar visibilidade. */}
      <FadeInSection delay={150}>
        <StoreBanner />
      </FadeInSection>

      {continueWatching.length > 0 && (
        <Section title={t("home.continueWatching")} delay={200}>
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
              <h2 className="text-base font-bold tracking-tight text-foreground">{t("home.ourAthletes")}</h2>
              <button
                onClick={() => navigate("/professores")}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary"
              >
                {t("home.seeAll")} <ChevronRight size={12} />
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

    </MobileLayout>
  );
};

export default Index;
