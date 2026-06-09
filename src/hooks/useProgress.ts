import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { videos as mockVideos } from "@/data/mockData";

interface ProgressUpdate {
  userId: string;
  videoId: string;
  progress: number;
  watched?: boolean;
}

interface FavoriteToggle {
  userId: string;
  videoId: string;
  isFavorite: boolean;
}

const PROGRESS_KEY  = "rasta_progress";
const FAVORITES_KEY = "rasta_favorites";

type ProgressStore = Record<string, { progress: number; watched: boolean }>;

function isSupabaseUser(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

function loadProgressStore(): ProgressStore {
  try { return JSON.parse(sessionStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveProgressStore(store: ProgressStore) {
  sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
}

function loadFavorites(): string[] {
  try { return JSON.parse(sessionStorage.getItem(FAVORITES_KEY) ?? "[]"); }
  catch { return []; }
}

export function useOverallProgress(userId: string) {
  return useQuery({
    queryKey: ["overall-progress", userId],
    queryFn: async () => {
      if (isSupabaseUser(userId)) {
        try {
          const { data } = await supabase.rpc("get_user_overall_progress", { p_user_id: userId });
          if (data !== null && data !== undefined) return data as number;
        } catch { /* fallback */ }
      }
      const store = loadProgressStore();
      const vis   = mockVideos.filter((v) => v.visible !== false);
      if (vis.length === 0) return 0;
      const watched = vis.filter((v) => store[v.id]?.watched ?? v.watched ?? false).length;
      return Math.round((watched / vis.length) * 100);
    },
    enabled:   !!userId,
    staleTime: 0,
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, videoId, progress, watched }: ProgressUpdate) => {
      const isWatched = watched ?? progress === 100;

      if (isSupabaseUser(userId)) {
        await supabase.from("user_progress").upsert(
          { user_id: userId, video_id: videoId, progress, watched: isWatched, last_watched_at: new Date().toISOString() },
          { onConflict: "user_id,video_id" }
        );
        // Atualiza videos_watched e total_hours no perfil
        const { data: allProgress } = await supabase
          .from("user_progress")
          .select("video_id, watched")
          .eq("user_id", userId);
        const watchedCount = allProgress?.filter((p) => p.watched).length ?? 0;
        await supabase.from("profiles").update({ videos_watched: watchedCount }).eq("id", userId);
      } else {
        const store = loadProgressStore();
        store[videoId] = { progress, watched: isWatched };
        saveProgressStore(store);
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["videos",           vars.userId] });
      qc.invalidateQueries({ queryKey: ["overall-progress", vars.userId] });
      qc.invalidateQueries({ queryKey: ["profile",          vars.userId] });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, videoId, isFavorite }: FavoriteToggle) => {
      if (isSupabaseUser(userId)) {
        await supabase.from("user_progress").upsert(
          { user_id: userId, video_id: videoId, is_favorite: isFavorite },
          { onConflict: "user_id,video_id" }
        );
      } else {
        const favs = loadFavorites();
        const next = isFavorite
          ? [...new Set([...favs, videoId])]
          : favs.filter((id) => id !== videoId);
        sessionStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["videos", vars.userId] });
    },
  });
}
