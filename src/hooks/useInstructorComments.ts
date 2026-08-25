import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface InstructorComment {
  id: string;
  instructorId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

const KEY = "rasta_instructor_comments";

// ── Fallback local (modo demo sem Supabase, ou migration 013 ainda não aplicada)

function load(): InstructorComment[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(comments: InstructorComment[]) {
  sessionStorage.setItem(KEY, JSON.stringify(comments));
}

/**
 * true quando o erro indica que a tabela instructor_comments ainda não existe
 * (migration 013 não aplicada). Nesse caso degradamos para o sessionStorage,
 * como antes. Qualquer OUTRO erro é propagado para a UI exibir o toast de erro.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMissingTableError(error: any): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

/** Retorna os comentários de um instrutor e funções para adicionar/remover. */
export function useInstructorComments(instructorId: string) {
  const qc = useQueryClient();
  const queryKey = ["instructor-comments", instructorId];

  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: async (): Promise<InstructorComment[]> => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("instructor_comments")
            .select("*")
            .eq("instructor_id", instructorId)
            .order("created_at", { ascending: true });
          if (!error && data) {
            return data.map((row) => ({
              id:           row.id,
              instructorId: row.instructor_id,
              userId:       row.user_id,
              userName:     row.user_name,
              text:         row.content,
              createdAt:    row.created_at,
            }));
          }
          if (error && !isMissingTableError(error)) throw error;
        } catch (e) {
          if (!isMissingTableError(e)) throw e;
          // tabela ausente → cai no fallback local abaixo
        }
      }
      return load().filter((c) => c.instructorId === instructorId);
    },
    enabled: !!instructorId,
  });

  const addMutation = useMutation({
    mutationFn: async ({ userId, userName, text }: {
      userId: string; userName: string; text: string;
    }): Promise<InstructorComment> => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("instructor_comments")
          .insert({
            instructor_id: instructorId,
            user_id:       userId,
            user_name:     userName,
            content:       text.trim(),
          })
          .select()
          .single();
        if (!error && data) {
          return {
            id:           data.id,
            instructorId: data.instructor_id,
            userId:       data.user_id,
            userName:     data.user_name,
            text:         data.content,
            createdAt:    data.created_at,
          };
        }
        // Tabela ausente (migration 013 não aplicada): salva local. Erros
        // reais propagam para o onError da mutation (toast de erro na UI).
        if (error && !isMissingTableError(error)) throw error;
      }
      const newComment: InstructorComment = {
        id:           `cmt-${Date.now()}`,
        instructorId,
        userId,
        userName,
        text:         text.trim(),
        createdAt:    new Date().toISOString(),
      };
      persist([...load(), newComment]);
      return newComment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("instructor_comments")
          .delete()
          .eq("id", commentId);
        if (!error) return;
        if (!isMissingTableError(error)) throw error;
      }
      persist(load().filter((c) => c.id !== commentId));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const addComment = useCallback(
    (userId: string, userName: string, text: string) =>
      addMutation.mutateAsync({ userId, userName, text }),
    [addMutation]
  );

  const removeComment = useCallback(
    (commentId: string) => removeMutation.mutateAsync(commentId),
    [removeMutation]
  );

  const userComment = (userId: string) =>
    comments.find((c) => c.userId === userId);

  return { comments, addComment, removeComment, userComment };
}
