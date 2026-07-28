import { useEffect, useRef, useState, ReactNode } from "react";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { useModules, moduleNames } from "@/hooks/useModules";
import { cn } from "@/lib/utils";

/** Anima a entrada da seção ao entrar na viewport (mesmo padrão da Home). */
function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: 0.12 }
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
}

/**
 * Seções de tópicos (posições) na Home. Cada tópico é uma subcategoria/módulo
 * gerenciado no admin (Vídeos → Módulos). Os vídeos são agrupados por
 * `subcategory`; a ordem segue a lista de módulos cadastrada.
 */
const TopicSections = () => {
  const { user }               = useAuth();
  const { data: videos = [] }  = useVideos(user?.id ?? "");
  const { data: modules = [] } = useModules();

  // Ordem dos tópicos: a dos módulos cadastrados (respeita o admin); tópicos que
  // só existem em vídeos entram depois, em ordem alfabética.
  const ordered = moduleNames(modules);
  const extras = Array.from(new Set(videos.map((v) => v.subcategory)))
    .filter((s) => s && !ordered.includes(s))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const topics = [...ordered, ...extras];

  // Mantém só os tópicos que têm ao menos um vídeo.
  const sections = topics
    .map((topic) => ({ topic, items: videos.filter((v) => v.subcategory === topic) }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="mt-2">
      {sections.map(({ topic, items }, i) => (
        <FadeIn key={topic} delay={i === 0 ? 0 : 80}>
          <section className="mt-6">
            <h2 className="mb-3 px-4 text-base font-bold text-foreground">{topic}</h2>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", overflowX: "scroll" }}
            >
              {items.map((v) => (
                <VideoCard key={v.id} video={v} size="sm" />
              ))}
              <div className="shrink-0 w-1" aria-hidden="true" />
            </div>
          </section>
        </FadeIn>
      ))}
    </div>
  );
};

export default TopicSections;
