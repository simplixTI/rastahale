import { useMemo } from "react";
import { useAdminUsers } from "@/hooks/useAdminData";
import { useSeason, seasonPoints, type SeasonConfig } from "@/hooks/useSeason";
import { beltForPoints, type BeltProgress } from "@/lib/belts";

export interface RankedStudent {
  id:            string;
  name:          string;
  avatarUrl:     string;
  videosWatched: number;
  points:        number;      // pontos da TEMPORADA (desde o último reinício)
  belt:          BeltProgress;
  position:      number;      // 1-based
}

/**
 * Ranking de alunos por pontos da temporada (aulas assistidas desde o último
 * reinício). Lê a tabela de perfis (useAdminUsers) + a config da temporada
 * (baselines) e ordena no cliente.
 *
 * Observação de RLS: em produção, se a política do Supabase permitir que o
 * aluno leia apenas o próprio perfil, o ranking mostrará só ele. O admin lê
 * todos, então a premiação (feita pelo painel admin) funciona normalmente.
 */
export function useStudentRanking() {
  const { data: users = [], isLoading: loadUsers }   = useAdminUsers();
  const { data: season, isLoading: loadSeason }      = useSeason();

  const ranking = useMemo<RankedStudent[]>(() => {
    const baselines      = season?.baselines ?? {};
    const seasonStarted  = Object.keys(baselines).length > 0;
    return users
      .filter((u) => u.role === "user")
      .map((u) => {
        const watched = u.videos_watched ?? 0;
        // Sem temporada iniciada: conta as aulas totais (baseline 0).
        // Com temporada: conta a partir do baseline; quem entrou depois começa em 0.
        const baseline = seasonStarted ? (baselines[u.id] ?? watched) : 0;
        const points   = seasonPoints(watched, baseline);
        return {
          id:            u.id,
          name:          u.name,
          avatarUrl:     u.avatar_url ?? "",
          videosWatched: watched,
          points,
          belt:          beltForPoints(points),
          position:      0,
        };
      })
      .sort((a, b) =>
        b.points - a.points ||
        b.videosWatched - a.videosWatched ||
        a.name.localeCompare(b.name, "pt-BR")
      )
      .map((s, i) => ({ ...s, position: i + 1 }));
  }, [users, season]);

  return { ranking, season: season as SeasonConfig | undefined, isLoading: loadUsers || loadSeason };
}
