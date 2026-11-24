import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoWithProgress } from "@/hooks/useVideos";
import { useLabels } from "@/i18n/labels";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Pill, levelColor } from "@/components/Pill";
import { useTranslation } from "react-i18next";
import UpcomingTag from "@/components/UpcomingTag";
import { formatRelease, isUpcoming } from "@/lib/release";

interface VideoCardProps {
  video: VideoWithProgress;
  size?: "sm" | "md";
  /** Ocupa toda a largura da célula em vez da largura fixa de carrossel. */
  fluid?: boolean;
}

const VideoCard = ({ video, size = "md", fluid = false }: VideoCardProps) => {
  const navigate = useNavigate();
  const labels   = useLabels();
  const { t, i18n } = useTranslation();
  const upcoming = isUpcoming(video.releaseAt);
  // fluid: ocupa a célula da grade (busca, favoritos); senão, largura fixa de carrossel.
  const w = fluid ? "w-full min-w-0" : size === "sm" ? "min-w-[144px] w-36" : "min-w-[176px] w-44";

  return (
    <button
      onClick={() => navigate(`/video/${video.id}`)}
      className={cn(
        "group flex-shrink-0 text-left transition-transform duration-300 ease-out hover:-translate-y-1",
        w
      )}
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 shadow-md transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
        <img
          src={video.thumbnail}
          alt={video.title}
          className={cn(
            "h-full w-full object-cover transition-all duration-500",
            upcoming ? "opacity-60 grayscale" : "group-hover:scale-110 group-hover:brightness-75"
          )}
          loading="lazy"
        />
        {/* Gradient overlay always visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {upcoming ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <UpcomingTag />
          </div>
        ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="scale-75 rounded-full bg-primary/90 p-2.5 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-100">
            <Play size={20} className="text-primary-foreground" fill="currentColor" />
          </div>
        </div>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
          {video.duration}
        </span>
        {video.progress !== undefined && video.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={video.progress} className="h-1 rounded-none bg-muted/50" />
          </div>
        )}
      </div>
      <p className={cn(
        "mt-2 line-clamp-2 text-xs font-semibold leading-tight transition-colors duration-200",
        upcoming ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
      )}>
        {video.title}
      </p>
      {upcoming && video.releaseAt && (
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          {t("video.releaseOn", { date: formatRelease(video.releaseAt, i18n.language) })}
        </p>
      )}
    </button>
  );
};

export default VideoCard;
