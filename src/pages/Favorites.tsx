import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import { useFavoriteVideos } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";

const Favorites = () => {
  const { user } = useAuth();
  const { t }    = useTranslation();
  const { data: favorites = [], isLoading } = useFavoriteVideos(user?.id ?? "");

  return (
    <MobileLayout>
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-foreground">{t("favorites.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("favorites.saved", { count: favorites.length })}</p>
      </header>

      {isLoading ? (
        <div className="mt-24 flex justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : favorites.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4">
          {favorites.map((v) => (
            <VideoCard key={v.id} video={v} size="sm" />
          ))}
        </div>
      ) : (
        <div className="mt-24 flex flex-col items-center text-center">
          <Heart size={40} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("favorites.empty")}</p>
        </div>
      )}
    </MobileLayout>
  );
};

export default Favorites;
