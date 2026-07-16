import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { videos as mockVideos } from "@/data/mockData";

export interface VideoWithProgress {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string | null;
  duration: string;
  category: string;
  subcategory: string;
  level: "Iniciante" | "Intermediário" | "Avançado";
  instructorId: string;
  visible: boolean;
  unlockByProgress: boolean;
  requiredProgress: number;
  progress: number;
  watched: boolean;
  isFavorite: boolean;
}

const PROGRESS_KEY  = "rasta_progress";
const FAVORITES_KEY = "rasta_favorites";

type ProgressStore = Record<string, { progress: number; watched: boolean }>;

function loadProgressStore(): ProgressStore {
  try { return JSON.parse(sessionStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}

function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(FAVORITES_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function isSupabaseUser(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

// Modo demo = Supabase não configurado. isSupabaseUser() (acima) segue para as
// checagens por-usuário (progresso/favoritos), que usam UUID de aluno real.
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

async function fetchVideosFromSupabase(userId: string): Promise<VideoWithProgress[]> {
  let vids: Database["public"]["Tables"]["videos"]["Row"][] = [];
  try {
    const { data, error } = await supabase.from("videos").select("*").eq("visible", true);
    if (error || !data || data.length === 0) return [];
    vids = data;
  } catch { return []; }

  let progressMap: Record<string, { progress: number; watched: boolean; is_favorite: boolean }> = {};

  if (isSupabaseUser(userId)) {
    try {
      const { data: prog } = await supabase
        .from("user_progress")
        .select("video_id, progress, watched, is_favorite")
        .eq("user_id", userId);
      if (prog) {
        prog.forEach((p) => {
          progressMap[p.video_id] = { progress: p.progress, watched: p.watched, is_favorite: p.is_favorite };
        });
      }
    } catch { /* sem progresso — ok */ }
  } else {
    const store = loadProgressStore();
    const favs  = loadFavorites();
    Object.entries(store).forEach(([vid, val]) => {
      progressMap[vid] = { progress: val.progress, watched: val.watched, is_favorite: favs.has(vid) };
    });
    favs.forEach((vid) => {
      if (!progressMap[vid]) progressMap[vid] = { progress: 0, watched: false, is_favorite: true };
      else progressMap[vid].is_favorite = true;
    });
  }

  return vids.map((v) => {
    const p = progressMap[v.id];
    return {
      id:               v.id,
      title:            v.title,
      description:      v.description ?? "",
      thumbnail:        v.thumbnail ?? "",
      videoUrl:         v.video_url ?? null,
      duration:         v.duration,
      category:         v.category as string,
      subcategory:      v.subcategory,
      level:            v.level as "Iniciante" | "Intermediário" | "Avançado",
      instructorId:     v.instructor_id,
      visible:          v.visible,
      unlockByProgress: v.unlock_by_progress,
      requiredProgress: v.required_progress,
      progress:         p?.progress    ?? 0,
      watched:          p?.watched     ?? false,
      isFavorite:       p?.is_favorite ?? false,
    };
  });
}

function buildMockVideoList(userId: string): VideoWithProgress[] {
  const store     = loadProgressStore();
  const favorites = loadFavorites();

  return mockVideos
    .filter((v) => v.visible !== false)
    .map((v) => ({
      id:               v.id,
      title:            v.title,
      description:      v.description,
      thumbnail:        v.thumbnail,
      videoUrl:         v.videoUrl ?? null,
      duration:         v.duration,
      category:         v.category,
      subcategory:      v.subcategory,
      level:            v.level,
      instructorId:     v.instructorId,
      visible:          v.visible ?? true,
      unlockByProgress: v.unlockByProgress ?? false,
      requiredProgress: v.requiredProgress ?? 0,
      progress:         store[v.id]?.progress ?? v.progress  ?? 0,
      watched:          store[v.id]?.watched  ?? v.watched   ?? false,
      isFavorite:       favorites.has(v.id),
    }));
}

export function useVideos(userId: string) {
  return useQuery({
    queryKey: ["videos", userId],
    queryFn: async () => {
      if (!isMockMode()) {
        const fromSupabase = await fetchVideosFromSupabase(userId);
        if (fromSupabase.length > 0) return fromSupabase;
      }
      return buildMockVideoList(userId);
    },
    enabled:   !!userId,
    staleTime: 0,
  });
}

export function useFavoriteVideos(userId: string) {
  const query = useVideos(userId);
  return {
    ...query,
    data: query.data?.filter((v) => v.isFavorite) ?? [],
  };
}

export function useVideoById(videoId: string, userId: string) {
  const query = useVideos(userId);
  return {
    ...query,
    data: query.data?.find((v) => v.id === videoId),
  };
}
