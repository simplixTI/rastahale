import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ── Temporada / Desafio ────────────────────────────────────────────────────────
//
// Uma "temporada" é um desafio com data final definida pelo admin. Quando a data
// chega, o admin encerra pelo painel: o 1º colocado recebe um voucher e os níveis
// reiniciam (reset NÃO-destrutivo — guardamos um "baseline" de aulas assistidas
// por aluno; os pontos da temporada contam só o que foi assistido a partir dali).
//
// Estado compartilhado fica na tabela `seasons` (uma linha, id="current"). Segue
// o padrão do useModules: acessa via cast, e cai para o localStorage quando a
// tabela ainda não existe (migração não aplicada) ou no modo demo. Nesse modo o
// estado é por navegador — para valer entre usuários, aplicar a migração
// `seasons` no Supabase (ver supabase/migrations).

export interface SeasonConfig {
  endsAt:     string | null;              // ISO — data final do desafio
  prizeText:  string;                     // ex: "R$100 na loja RastaHale"
  prizeCode:  string;                     // ex: "RASTA100"
  startedAt:  string;                     // ISO — início da temporada atual
  baselines:  Record<string, number>;     // userId -> aulas assistidas no início
  winnerId:   string | null;
  winnerName: string | null;
  awardedAt:  string | null;              // ISO — quando o prêmio foi entregue
}

const LOCAL_KEY = "rasta_season";

const DEFAULT_SEASON: SeasonConfig = {
  endsAt:     null,
  prizeText:  "",
  prizeCode:  "",
  startedAt:  new Date().toISOString(),
  baselines:  {},
  winnerId:   null,
  winnerName: null,
  awardedAt:  null,
};

function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

// Tabela `seasons` não está no tipo gerado do banco — acessa via cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const seasonsTable = () => (supabase as any).from("seasons");

function loadLocal(): SeasonConfig {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULT_SEASON, ...JSON.parse(raw) } : { ...DEFAULT_SEASON };
  } catch {
    return { ...DEFAULT_SEASON };
  }
}

function saveLocal(cfg: SeasonConfig) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg)); } catch { /* ignora */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToConfig(row: any): SeasonConfig {
  return {
    endsAt:     row.ends_at     ?? null,
    prizeText:  row.prize_text  ?? "",
    prizeCode:  row.prize_code  ?? "",
    startedAt:  row.started_at  ?? new Date().toISOString(),
    baselines:  row.baselines   ?? {},
    winnerId:   row.winner_id   ?? null,
    winnerName: row.winner_name ?? null,
    awardedAt:  row.awarded_at  ?? null,
  };
}

function configToRow(cfg: SeasonConfig) {
  return {
    id:          "current",
    ends_at:     cfg.endsAt,
    prize_text:  cfg.prizeText,
    prize_code:  cfg.prizeCode,
    started_at:  cfg.startedAt,
    baselines:   cfg.baselines,
    winner_id:   cfg.winnerId,
    winner_name: cfg.winnerName,
    awarded_at:  cfg.awardedAt,
  };
}

async function fetchSeason(): Promise<SeasonConfig> {
  if (!isMockMode()) {
    try {
      const { data, error } = await seasonsTable().select("*").eq("id", "current").maybeSingle();
      if (!error && data) return rowToConfig(data);
      // erro (tabela ausente) → cai para o local
    } catch { /* Supabase inacessível — usa local */ }
  }
  return loadLocal();
}

async function persistSeason(cfg: SeasonConfig): Promise<void> {
  if (!isMockMode()) {
    try {
      const { error } = await seasonsTable().upsert(configToRow(cfg));
      if (!error) return;
    } catch { /* cai para o local */ }
  }
  saveLocal(cfg);
}

export function useSeason() {
  return useQuery({
    queryKey:  ["season"],
    queryFn:   fetchSeason,
    staleTime: 1000 * 30,
  });
}

/** Pontos de um aluno na temporada: aulas assistidas desde o início × 10. */
export function seasonPoints(videosWatched: number, baseline: number): number {
  return Math.max(0, videosWatched - baseline) * 10;
}

/** true quando a data final já passou. */
export function seasonHasEnded(cfg?: SeasonConfig | null): boolean {
  if (!cfg?.endsAt) return false;
  return new Date(cfg.endsAt).getTime() <= Date.now();
}

// ── Admin: configurar data + prêmio ─────────────────────────────────────────────

export function useSaveSeasonConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ endsAt, prizeText, prizeCode }: {
      endsAt: string | null; prizeText: string; prizeCode: string;
    }) => {
      const current = await fetchSeason();
      await persistSeason({ ...current, endsAt, prizeText, prizeCode });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["season"] }),
  });
}

// ── Admin: (re)iniciar temporada — zera os níveis (reset não-destrutivo) ─────────

/** Snapshot das aulas assistidas de cada aluno → todos voltam a 0 pontos. */
export function useRestartSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ students }: { students: { id: string; videosWatched: number }[] }) => {
      const current   = await fetchSeason();
      const baselines: Record<string, number> = {};
      for (const s of students) baselines[s.id] = s.videosWatched;
      await persistSeason({
        ...current,
        baselines,
        startedAt:  new Date().toISOString(),
        winnerId:   null,
        winnerName: null,
        awardedAt:  null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["season"] });
      qc.invalidateQueries({ queryKey: ["student-ranking"] });
    },
  });
}

// ── Admin: encerrar e premiar o 1º lugar (+ reinicia) ───────────────────────────

export function useAwardAndRestart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ winner, students }: {
      winner: { id: string; name: string };
      students: { id: string; videosWatched: number }[];
    }) => {
      const current   = await fetchSeason();
      const baselines: Record<string, number> = {};
      for (const s of students) baselines[s.id] = s.videosWatched;
      await persistSeason({
        ...current,
        winnerId:   winner.id,
        winnerName: winner.name,
        awardedAt:  new Date().toISOString(),
        // novos níveis já zerados para a próxima temporada
        baselines,
        startedAt:  new Date().toISOString(),
        endsAt:     null, // admin define nova data para o próximo desafio
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["season"] });
      qc.invalidateQueries({ queryKey: ["student-ranking"] });
    },
  });
}
