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
            .order("created_at", { ascending: true });
          if (!error && data) {
            return data.map((row) => ({
              id:           row.id,
              instructorId: row.instructor_id,
              title:        row.title,
              description:  row.description,
              videoIds:     row.video_ids ?? [],
              createdAt:    row.created_at,
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
    mutationFn: async ({ title, description, videoIds }: {
      title: string; description: string; videoIds: string[];
    }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("studio_sessions").insert({
          instructor_id: instructorId,
          title:         title.trim(),
          description:   description.trim(),
          video_ids:     videoIds,
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
      }]);
    },
    onSuccess,
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, description, videoIds }: {
      id: string; title: string; description: string; videoIds: string[];
    }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("studio_sessions").update({
          title:       title.trim(),
          description: description.trim(),
          video_ids:   videoIds,
        }).eq("id", id);
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }
      persistLocal(instructorId, (all) => all.map((s) =>
        s.id === id ? { ...s, title: title.trim(), description: description.trim(), videoIds } : s
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

  const create = useCallback(
    (title: string, description: string, videoIds: string[]) =>
      createMutation.mutate({ title, description, videoIds }),
    [createMutation]
  );

  const update = useCallback(
    (id: string, title: string, description: string, videoIds: string[]) =>
      updateMutation.mutate({ id, title, description, videoIds }),
    [updateMutation]
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

  return { sessions, create, update, remove, addVideo, removeVideo };
}
