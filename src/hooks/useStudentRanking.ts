import { useMemo } from "react";
import { useAdminUsers } from "@/hooks/useAdminData";
import { studentPoints, beltForPoints, type BeltProgress } from "@/lib/belts";

export interface RankedStudent {
  id:            string;
  name:          string;
  avatarUrl:     string;
  videosWatched: number;
  totalHours:    number;
  points:        number;
  belt:          BeltProgress;
  position:      number; // 1-based
}

/**
 * Ranking de alunos por pontos (aulas assistidas + horas). Lê a tabela de
 * perfis (useAdminUsers) e ordena no cliente.
 *
 * Observação de RLS: em produção, se a política do Supabase permitir que o
 * aluno leia apenas o próprio perfil, o ranking mostrará só ele. Para um
 * ranking completo, os perfis (id, name, avatar, videos_watched, total_hours)
 * precisam ser legíveis por alunos autenticados.
 */
export function useStudentRanking() {
  const { data: users = [], isLoading } = useAdminUsers();

  const ranking = useMemo<RankedStudent[]>(() => {
    return users
      .filter((u) => u.role === "user")
      .map((u) => {
        const points = studentPoints(u.videos_watched ?? 0);
        return {
          id:            u.id,
          name:          u.name,
          avatarUrl:     u.avatar_url ?? "",
          videosWatched: u.videos_watched ?? 0,
          totalHours:    u.total_hours ?? 0,
          points,
          belt:          beltForPoints(points),
          position:      0,
        };
      })
      // mais pontos primeiro; desempate por mais aulas, depois nome
      .sort((a, b) =>
        b.points - a.points ||
        b.videosWatched - a.videosWatched ||
        a.name.localeCompare(b.name, "pt-BR")
      )
      .map((s, i) => ({ ...s, position: i + 1 }));
  }, [users]);

  return { ranking, isLoading };
}
