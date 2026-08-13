import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, CheckCircle, Play, Video as VideoIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoById, useVideos } from "@/hooks/useVideos";
import { useInstructor } from "@/hooks/useInstructors";
import { useToggleFavorite, useUpdateProgress } from "@/hooks/useProgress";
import VideoCard from "@/components/VideoCard";
import { useLabels } from "@/i18n/labels";
import { getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// Extrai o id de 11 caracteres de uma URL do YouTube
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Intervalo entre gravações de progresso durante a reprodução.
const SAVE_INTERVAL_MS = 10_000;

// ── YouTube IFrame API ────────────────────────────────────────────────────────
// Necessária para saber em que ponto do vídeo o aluno parou — o iframe simples
// não expõe o tempo de reprodução.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id  = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

function YouTubePlayer({ videoId, startAt, onProgress }: {
  videoId: string; startAt: number; onProgress: (pct: number) => void;
}) {
  const hostRef     = useRef<HTMLDivElement>(null);
  // Refs para o efeito não reiniciar o player a cada render.
  const progressRef = useRef(onProgress);
  const startAtRef  = useRef(startAt);
  useEffect(() => { progressRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    let player: any;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const report = () => {
      try {
        const total   = player?.getDuration?.() ?? 0;
        const current = player?.getCurrentTime?.() ?? 0;
        if (total > 0) progressRef.current((current / total) * 100);
      } catch { /* player já destruído */ }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => {
            if (startAtRef.current > 0) player.seekTo(startAtRef.current, true);
          },
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (!timer) timer = setInterval(report, SAVE_INTERVAL_MS);
            } else {
              if (timer) { clearInterval(timer); timer = undefined; }
              report();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      report();
      try { player?.destroy?.(); } catch { /* ignora */ }
    };
  }, [videoId]);

  return <div ref={hostRef} className="h-full w-full" />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── VideoPlayer ───────────────────────────────────────────────────────────────

function VideoPlayer({ videoUrl, thumbnail, title, startAt, onProgress }: {
  videoUrl: string | null; thumbnail: string; title: string;
  startAt: number; onProgress: (pct: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const { t }      = useTranslation();
  const videoRef   = useRef<HTMLVideoElement>(null);
  const lastSentAt = useRef(0);
  const seeked     = useRef(false);

  if (!videoUrl) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <img src={thumbnail} alt={title} className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <VideoIcon size={36} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t("video.noUrl")}</p>
        </div>
      </div>
    );
  }

  const youtubeId = getYouTubeId(videoUrl);

  if (youtubeId) {
    if (!playing) {
      return (
        <div className="relative aspect-video w-full bg-black">
          <img src={thumbnail} alt={title} className="h-full w-full object-cover opacity-80" />
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="rounded-full bg-primary p-4 shadow-xl hover:scale-105 transition-transform">
              <Play size={28} className="text-primary-foreground" fill="currentColor" />
            </div>
          </button>
        </div>
      );
    }
    return (
      <div className="aspect-video w-full bg-black">
        <YouTubePlayer videoId={youtubeId} startAt={startAt} onProgress={onProgress} />
      </div>
    );
  }

  // HTML5 video (mp4, webm, etc.)
  const report = () => {
    const el = videoRef.current;
    if (el && el.duration > 0) onProgress((el.currentTime / el.duration) * 100);
  };

  return (
    <div className="aspect-video w-full bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        autoPlay={false}
        className="h-full w-full"
        poster={thumbnail}
        controlsList="nodownload"
        onLoadedMetadata={() => {
          // Retoma de onde parou (só uma vez, para não brigar com o usuário).
          const el = videoRef.current;
          if (el && !seeked.current && startAt > 0 && startAt < el.duration) {
            seeked.current = true;
            el.currentTime = startAt;
          }
        }}
        onTimeUpdate={() => {
          const now = Date.now();
          if (now - lastSentAt.current < SAVE_INTERVAL_MS) return;
          lastSentAt.current = now;
          report();
        }}
        onPause={report}
        onEnded={() => onProgress(100)}
      >
        {t("video.noSupport")}
      </video>
    </div>
  );
}

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const labels   = useLabels();

  const { data: video, isLoading } = useVideoById(id ?? "", user?.id ?? "");
  const { data: instructor }       = useInstructor(video?.instructorId ?? "");
  const toggleFavoriteMutation     = useToggleFavorite();
  const updateProgressMutation     = useUpdateProgress();
  const { data: allVideos = [] }   = useVideos(user?.id ?? "");

  // Grava o progresso de reprodução. A partir de 95% conta como assistida —
  // os segundos finais (créditos, despedida) raramente são vistos até o fim.
  const lastSavedPct = useRef(-1);
  const handleProgress = useCallback((pct: number) => {
    const userId  = user?.id;
    const videoId = video?.id;
    if (!userId || !videoId) return;
    const rounded = Math.min(100, Math.max(0, Math.round(pct)));
    if (rounded < 1 || rounded === lastSavedPct.current) return;
    lastSavedPct.current = rounded;
    const finished = rounded >= 95;
    updateProgressMutation.mutate({
      userId, videoId,
      progress: finished ? 100 : rounded,
      watched:  finished,
    });
  }, [user?.id, video?.id, updateProgressMutation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("video.notFound")}</p>
      </div>
    );
  }

  const isFav     = video.isFavorite ?? false;
  const isWatched = video.watched ?? false;
  const related   = allVideos.filter((v) => v.category === video.category && v.id !== video.id).slice(0, 5);

  // Ponto de retomada, em segundos, a partir do progresso salvo.
  const startAt = (() => {
    const pct = video.progress ?? 0;
    if (isWatched || pct <= 0 || pct >= 95) return 0;
    const [min = 0, sec = 0] = (video.duration ?? "").split(":").map(Number);
    const totalSeconds = (min || 0) * 60 + (sec || 0);
    return totalSeconds > 0 ? Math.floor((pct / 100) * totalSeconds) : 0;
  })();

  const handleToggleFavorite = () => {
    if (!user) return;
    toggleFavoriteMutation.mutate({ userId: user.id, videoId: video.id, isFavorite: !isFav });
  };

  const handleToggleWatched = () => {
    if (!user) return;
    updateProgressMutation.mutate({
      userId:  user.id,
      videoId: video.id,
      progress: !isWatched ? 100 : 0,
      watched:  !isWatched,
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-24">
      {/* Player */}
      <div className="relative w-full">
        <VideoPlayer
          videoUrl={video.videoUrl ?? null}
          thumbnail={video.thumbnail}
          title={video.title}
          startAt={startAt}
          onProgress={handleProgress}
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{video.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{getCategoryLabel(video.category)}</span>
              <span>·</span>
              <span>{video.duration}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", getLevelColor(video.level))}>
                {labels.level(video.level)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleToggleFavorite}
            disabled={toggleFavoriteMutation.isPending}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
              isFav ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            )}
          >
            <Heart size={16} fill={isFav ? "currentColor" : "none"} />
            {isFav ? t("video.favorited") : t("video.favorite")}
          </button>
          <button
            onClick={handleToggleWatched}
            disabled={updateProgressMutation.isPending}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
              isWatched ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border bg-card text-muted-foreground"
            )}
          >
            <CheckCircle size={16} />
            {isWatched ? t("video.watched") : t("video.markWatched")}
          </button>
        </div>

        {/* Progress */}
        {video.progress !== undefined && video.progress > 0 && video.progress < 100 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("video.progress")}</span>
              <span>{video.progress}%</span>
            </div>
            <Progress value={video.progress} className="mt-1 h-2" />
          </div>
        )}

        {/* Instructor */}
        {instructor && (
          <button
            onClick={() => navigate(`/instrutor/${instructor.id}`)}
            className="mt-4 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 transition-colors"
          >
            <img src={instructor.avatar} alt={instructor.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{instructor.name}</p>
              <p className="text-xs text-muted-foreground truncate">{instructor.bio}</p>
            </div>
            <span className="text-[10px] font-semibold text-primary flex-shrink-0">{t("video.viewSection")}</span>
          </button>
        )}

        {/* Description */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">{t("video.about")}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{video.description}</p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("video.related")}</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {related.map((v) => (
                <VideoCard key={v.id} video={v} size="sm" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetail;
