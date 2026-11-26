import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface StudioSession {
  id:           string;
  instructorId: string;
  title:        string;
  description:  string;
  videoIds:     string[];
  createdAt:    string;
  /** Ordem do módulo na página do professor (migration 020). */
  position:     number;
  /** Capa escolhida; sem ela, usa-se a miniatura da primeira aula. */
  coverUrl:     string | null;
  /** Preço da venda avulsa em reais (migration 022); null = não vende avulso. */
  price:        number | null;
}

/** Campos opcionais de um módulo. `undefined` = não mexer; `null` = remover. */
export interface SessionExtras {
  coverUrl?: string | null;
}

const KEY = "rasta_studio_sessions";

// ── Fallback local (modo demo sem Supabase, ou migration 014 ainda não aplicada)

function load(): StudioSession[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(sessions: StudioSession[]) {
  sessionStorage.setItem(KEY, JSON.stringify(sessions));
}

/**
 * true quando o erro indica que a tabela studio_sessions ainda não existe
 * (migration 014 não aplicada). Nesse caso degradamos para o sessionStorage,
 * como antes. Qualquer OUTRO erro vira toast de erro (não finge sucesso).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMissingTableError(error: any): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

function persistLocal(instructorId: string, fn: (all: StudioSession[]) => StudioSession[]) {
  persist(fn(load()));
}

export function useStudioSessions(instructorId: string) {
  const qc = useQueryClient();
  const queryKey = ["studio-sessions", instructorId];

  const { data: sessions = [] } = useQuery({
    queryKey,
    queryFn: async (): Promise<StudioSession[]> => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("studio_sessions")
            .select("*")
            .eq("instructor_id", instructorId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true });
          if (!error && data) {
            return data.map((row) => ({
              id:           row.id,
              instructorId: row.instructor_id,
              title:        row.title,
              description:  row.description,
              videoIds:     row.video_ids ?? [],
              createdAt:    row.created_at,
              position:     row.position ?? 0,
              coverUrl:     row.cover_url ?? null,
              price:        row.price != null ? Number(row.price) : null,
            }));
          }
          if (error && !isMissingTableError(error)) throw error;
        } catch (e) {
          if (!isMissingTableError(e)) throw e;
          // tabela ausente → cai no fallback local abaixo
        }
      }
      return load().filter((s) => s.instructorId === instructorId);
    },
    enabled: !!instructorId,
  });

  // As páginas do Studio chamam create/update/remove sem await (fire-and-forget)
  // e já exibem toast próprio de sucesso; por isso as mutations usam `mutate`
  // e os erros reais são exibidos aqui via onError, sem mascarar falhas.
  const onError = (error: unknown) => {
    if (!isMissingTableError(error)) toast.error("Erro ao salvar sessão. Tente novamente.");
  };
  const onSuccess = () => qc.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: async ({ title, description, videoIds, extras }: {
      title: string; description: string; videoIds: string[]; extras?: SessionExtras;
    }) => {
      // Módulo novo entra no fim da lista.
      const position = sessions.reduce((max, s) => Math.max(max, s.position), 0) + 1;
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("studio_sessions").insert({
          instructor_id: instructorId,
          title:         title.trim(),
          description:   description.trim(),
          video_ids:     videoIds,
          position,
          cover_url:     extras?.coverUrl ?? null,
        });
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }
      persistLocal(instructorId, (all) => [...all, {
        id:           `sess-${Date.now()}`,
        instructorId,
        title:        title.trim(),
        description:  description.trim(),
        videoIds,
        createdAt:    new Date().toISOString(),
        position,
        coverUrl:     extras?.coverUrl ?? null,
        price:        null,
      }]);
    },
    onSuccess,
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, description, videoIds, extras }: {
      id: string; title: string; description: string; videoIds: string[]; extras?: SessionExtras;
    }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("studio_sessions").update({
          title:       title.trim(),
          description: description.trim(),
          video_ids:   videoIds,
          ...(extras?.coverUrl !== undefined ? { cover_url: extras.coverUrl } : {}),
        }).eq("id", id);
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }
      persistLocal(instructorId, (all) => all.map((s) =>
        s.id === id
          ? { ...s, title: title.trim(), description: description.trim(), videoIds,
              ...(extras?.coverUrl !== undefined ? { coverUrl: extras.coverUrl } : {}) }
          : s
      ));
    },
    onSuccess,
    onError,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("studio_sessions").delete().eq("id", id);
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }
      persistLocal(instructorId, (all) => all.filter((s) => s.id !== id));
    },
    onSuccess,
    onError,
  });

  // Reordenar módulos: grava a posição de cada um (são poucos por professor).
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (isSupabaseConfigured) {
        const results = await Promise.all(
          orderedIds.map((id, index) =>
            supabase.from("studio_sessions").update({ position: index + 1 }).eq("id", id)
          )
        );
        const failed = results.find((r) => r.error);
        if (!failed) return;
        if (!isMissingTableError(failed.error)) throw failed.error;
      }
      persistLocal(instructorId, (all) => all.map((s) => {
        const index = orderedIds.indexOf(s.id);
        return index >= 0 ? { ...s, position: index + 1 } : s;
      }));
    },
    // Otimista: a lista troca de lugar na hora, sem esperar o banco.
    onMutate: async (orderedIds: string[]) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<StudioSession[]>(queryKey);
      qc.setQueryData<StudioSession[]>(queryKey, (cur = []) =>
        orderedIds
          .map((id, index) => {
            const s = cur.find((x) => x.id === id);
            return s ? { ...s, position: index + 1 } : null;
          })
          .filter((s): s is StudioSession => !!s)
      );
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous);
      onError(error);
    },
    onSettled: onSuccess,
  });

  const create = useCallback(
    (title: string, description: string, videoIds: string[], extras?: SessionExtras) =>
      createMutation.mutate({ title, description, videoIds, extras }),
    [createMutation]
  );

  const update = useCallback(
    (id: string, title: string, description: string, videoIds: string[], extras?: SessionExtras) =>
      updateMutation.mutate({ id, title, description, videoIds, extras }),
    [updateMutation]
  );

  const reorder = useCallback(
    (orderedIds: string[]) => reorderMutation.mutate(orderedIds),
    [reorderMutation]
  );

  /** Tira a aula de um módulo e põe em outro, numa ação só. */
  const moveVideo = useCallback(
    (fromId: string, toId: string, videoId: string) => {
      const from = sessions.find((s) => s.id === fromId);
      const to   = sessions.find((s) => s.id === toId);
      if (!from || !to || fromId === toId) return;
      updateMutation.mutate({ id: fromId, title: from.title, description: from.description, videoIds: from.videoIds.filter((v) => v !== videoId) });
      if (!to.videoIds.includes(videoId)) {
        updateMutation.mutate({ id: toId, title: to.title, description: to.description, videoIds: [...to.videoIds, videoId] });
      }
    },
    [sessions, updateMutation]
  );

  const remove = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation]
  );

  const addVideo = useCallback(
    (sessionId: string, videoId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session || session.videoIds.includes(videoId)) return;
      update(sessionId, session.title, session.description, [...session.videoIds, videoId]);
    },
    [sessions, update]
  );

  const removeVideo = useCallback(
    (sessionId: string, videoId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      update(sessionId, session.title, session.description, session.videoIds.filter((v) => v !== videoId));
    },
    [sessions, update]
  );

  return { sessions, create, update, remove, addVideo, removeVideo, reorder, moveVideo };
}
