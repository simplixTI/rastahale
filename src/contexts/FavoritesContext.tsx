import { createContext, useContext, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface FavoritesCtx {
  isFavorite: (videoId: string) => boolean;
  toggleFavorite: (videoId: string, userId: string) => void;
}

const FavoritesContext = createContext<FavoritesCtx>({
  isFavorite: () => false,
  toggleFavorite: () => {},
});

export const useFavorites = () => useContext(FavoritesContext);

const STORAGE_KEY = "rasta_favorites";

function loadFromStorage(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Set<string>>(loadFromStorage);
  const qc = useQueryClient();

  const isFavorite = (videoId: string) => favorites.has(videoId);

  const toggleFavorite = (videoId: string, userId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
    // Mantém React Query sincronizado para que useFavoriteVideos reflita a mudança
    qc.invalidateQueries({ queryKey: ["videos", userId] });
  };

  return (
    <FavoritesContext.Provider value={{ isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};
