import { useState, useCallback } from "react";

export interface InstructorComment {
  id: string;
  instructorId: string;
  userId: string;
  userName: string;
  text: string;
  rating: number; // 1–5
  createdAt: string;
}

const KEY = "rasta_instructor_comments";

function load(): InstructorComment[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(comments: InstructorComment[]) {
  sessionStorage.setItem(KEY, JSON.stringify(comments));
}

/** Retorna os comentários de um instrutor e funções para adicionar/remover. */
export function useInstructorComments(instructorId: string) {
  const [all, setAll] = useState<InstructorComment[]>(load);

  const comments = all.filter((c) => c.instructorId === instructorId);

  const addComment = useCallback((
    userId: string,
    userName: string,
    text: string,
    rating: number,
  ) => {
    const newComment: InstructorComment = {
      id:           `cmt-${Date.now()}`,
      instructorId,
      userId,
      userName,
      text:         text.trim(),
      rating:       Math.max(1, Math.min(5, Math.round(rating))),
      createdAt:    new Date().toISOString(),
    };
    const updated = [...load(), newComment];
    persist(updated);
    setAll(updated);
    return newComment;
  }, [instructorId]);

  const removeComment = useCallback((commentId: string) => {
    const updated = load().filter((c) => c.id !== commentId);
    persist(updated);
    setAll(updated);
  }, []);

  const userComment = (userId: string) =>
    comments.find((c) => c.userId === userId);

  const avgRating = comments.length
    ? comments.reduce((s, c) => s + c.rating, 0) / comments.length
    : 0;

  return { comments, addComment, removeComment, userComment, avgRating };
}

/** Agrega todos os comentários para o ranking global. */
export function useAllComments() {
  const [all] = useState<InstructorComment[]>(load);
  return all;
}
