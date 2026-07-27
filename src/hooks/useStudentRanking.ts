import { useMemo } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
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
 * reinício). Lê o leaderboard (useLeaderboard) + a config da temporada
 * (baselines) e ordena no cliente.
 *
 * Observação de RLS: com a view `leaderboard` aplicada (migração 011), o aluno
 * vê todos os concorrentes. Sem ela, o fallback usa `profiles` — e aí a RLS
 * mostra só o próprio aluno (o admin continua vendo todos).
 */
export function useStudentRanking() {
  const { data: users = [], isLoading: loadUsers }   = useLeaderboard();
  const { data: season, isLoading: loadSeason }      = useSeason();

  const ranking = useMemo<RankedStudent[]>(() => {
    const baselines      = season?.baselines ?? {};
    const seasonStarted  = Object.keys(baselines).length > 0;
    return users
      .map((u) => {
        const watched = u.videosWatched ?? 0;
        // Sem temporada iniciada: conta as aulas totais (baseline 0).
        // Com temporada: conta a partir do baseline; quem entrou depois começa em 0.
        const baseline = seasonStarted ? (baselines[u.id] ?? watched) : 0;
        const points   = seasonPoints(watched, baseline);
        return {
          id:            u.id,
          name:          u.name,
          avatarUrl:     u.avatarUrl ?? "",
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
