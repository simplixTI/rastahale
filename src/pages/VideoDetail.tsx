import { useState } from "react";
import { ArrowLeft, Heart, CheckCircle, Play, Video as VideoIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoById, useVideos } from "@/hooks/useVideos";
import { useInstructor } from "@/hooks/useInstructors";
import { useToggleFavorite, useUpdateProgress } from "@/hooks/useProgress";
import VideoCard from "@/components/VideoCard";
import { getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// Detecta e normaliza URL do YouTube → embed
function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  return null;
}

function VideoPlayer({ videoUrl, thumbnail, title }: { videoUrl: string | null; thumbnail: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (!videoUrl) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <img src={thumbnail} alt={title} className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <VideoIcon size={36} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">URL do vídeo não configurada</p>
        </div>
      </div>
    );
  }

  const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);

  if (youtubeEmbed) {
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
        <iframe
          src={youtubeEmbed}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // HTML5 video (mp4, webm, etc.)
  return (
    <div className="aspect-video w-full bg-black">
      <video
        src={videoUrl}
        controls
        autoPlay={false}
        className="h-full w-full"
        poster={thumbnail}
        controlsList="nodownload"
      >
        Seu navegador não suporta reprodução de vídeo.
      </video>
    </div>
  );
}

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: video, isLoading } = useVideoById(id ?? "", user?.id ?? "");
  const { data: instructor }       = useInstructor(video?.instructorId ?? "");
  const toggleFavoriteMutation     = useToggleFavorite();
  const updateProgressMutation     = useUpdateProgress();
  const { data: allVideos = [] }   = useVideos(user?.id ?? "");

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
        <p className="text-muted-foreground">Vídeo não encontrado</p>
      </div>
    );
  }

  const isFav     = video.isFavorite ?? false;
  const isWatched = video.watched ?? false;
  const related   = allVideos.filter((v) => v.category === video.category && v.id !== video.id).slice(0, 5);

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
        <VideoPlayer videoUrl={video.videoUrl ?? null} thumbnail={video.thumbnail} title={video.title} />
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
                {video.level}
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
            {isFav ? "Favoritado" : "Favoritar"}
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
            {isWatched ? "Assistido" : "Marcar assistido"}
          </button>
        </div>

        {/* Progress */}
        {video.progress !== undefined && video.progress > 0 && video.progress < 100 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
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
            <span className="text-[10px] font-semibold text-primary flex-shrink-0">Ver sessão →</span>
          </button>
        )}

        {/* Description */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">Sobre esta aula</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{video.description}</p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Vídeos Relacionados</h3>
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
