import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import { useFavoriteVideos } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";

const Favorites = () => {
  const navigate = useNavigate();
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
        <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          {favorites.map((v) => (
            <VideoCard key={v.id} video={v} size="sm" fluid />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-20 flex max-w-xs flex-col items-center px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Heart size={24} className="text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">{t("favorites.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("favorites.emptyHint")}</p>
          <button
            type="button"
            onClick={() => navigate("/buscar")}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("favorites.explore")}
          </button>
        </div>
      )}
    </MobileLayout>
  );
};

export default Favorites;
