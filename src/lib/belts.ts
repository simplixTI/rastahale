// Sistema de pontos e faixas do aluno (gamificação da Home).
//
// Pontos vêm de um sinal real e compartilhado entre alunos (tabela profiles):
//   • cada aula assistida = 10 pts
// Assim a escada de faixas fica direta: 5 / 15 / 30 / 50 aulas.
// Comentários ainda não entram porque vivem só no sessionStorage de cada
// navegador — não dá para comparar alunos de forma justa sem uma tabela no banco.
// (Horas assistidas foram deixadas de fora de propósito: são redundantes com o
// nº de aulas e, quando o total_hours do perfil vem inflado, dominariam tudo.)

export interface Belt {
  name:  string;
  emoji: string;
  /** cor da faixa (hex) — usada no "pontinho" ao lado do nome */
  color: string;
  /** pontuação mínima para alcançar esta faixa */
  min:   number;
}

// Ordem crescente. A última faixa não tem teto.
export const BELTS: Belt[] = [
  { name: "Faixa Branca", emoji: "⚪", color: "#e5e7eb", min: 0   },
  { name: "Faixa Azul",   emoji: "🔵", color: "#3b82f6", min: 50  },
  { name: "Faixa Roxa",   emoji: "🟣", color: "#a855f7", min: 150 },
  { name: "Faixa Marrom", emoji: "🟤", color: "#92400e", min: 300 },
  { name: "Faixa Preta",  emoji: "⚫", color: "#111827", min: 500 },
];

/** Pontos de um aluno a partir do número de aulas assistidas. */
export function studentPoints(videosWatched: number): number {
  return videosWatched * 10;
}

export interface BeltProgress {
  belt:        Belt;
  /** próxima faixa, ou null se já está na última */
  next:        Belt | null;
  /** pontos que faltam para a próxima faixa (0 se é a última) */
  pointsToNext: number;
  /** 0–100: progresso dentro da faixa atual rumo à próxima (100 na última) */
  progressPct: number;
}

/** Faixa atual e progresso rumo à próxima, dado o total de pontos. */
export function beltForPoints(points: number): BeltProgress {
  let index = 0;
  for (let i = 0; i < BELTS.length; i++) {
    if (points >= BELTS[i].min) index = i;
  }
  const belt = BELTS[index];
  const next = BELTS[index + 1] ?? null;

  if (!next) {
    return { belt, next: null, pointsToNext: 0, progressPct: 100 };
  }

  const span      = next.min - belt.min;
  const into      = points - belt.min;
  const progress  = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  return { belt, next, pointsToNext: Math.max(0, next.min - points), progressPct: progress };
}
