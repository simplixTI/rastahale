import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mockUsers } from "@/data/mockData";

export interface LeaderboardEntry {
  id:            string;
  name:          string;
  avatarUrl:     string;
  videosWatched: number;
}

function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

/**
 * Lista de alunos para o ranking (nome, avatar, aulas assistidas).
 *
 * Ordem de preferência:
 *  1. view pública `leaderboard` — todos os alunos (migração 011). É o que faz
 *     o aluno enxergar os concorrentes.
 *  2. tabela `profiles` — fallback quando a view ainda não existe. A RLS pode
 *     limitar ao próprio aluno (ele vê só a si mesmo); o admin vê todos.
 *  3. mock — modo demo.
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!isMockMode()) {
        // 1) view dedicada
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase as any)
            .from("leaderboard")
            .select("id, name, avatar_url, videos_watched");
          if (!error && data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data as any[]).map((u) => ({
              id:            u.id,
              name:          u.name,
              avatarUrl:     u.avatar_url ?? "",
              videosWatched: u.videos_watched ?? 0,
            }));
          }
        } catch { /* view ausente — tenta profiles */ }

        // 2) fallback: profiles (RLS pode limitar ao próprio aluno)
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, name, avatar_url, videos_watched, role");
          if (!error && data) {
            return data
              .filter((u) => u.role === "user")
              .map((u) => ({
                id:            u.id,
                name:          u.name,
                avatarUrl:     u.avatar_url ?? "",
                videosWatched: u.videos_watched ?? 0,
              }));
          }
        } catch { /* cai para o mock */ }
      }

      return mockUsers.map((u) => ({
        id:            u.id,
        name:          u.name,
        avatarUrl:     u.avatar,
        videosWatched: u.videosWatched,
      }));
    },
    staleTime: 1000 * 30,
  });
}
