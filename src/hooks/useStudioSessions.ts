import { useState, useCallback } from "react";

export interface StudioSession {
  id:           string;
  instructorId: string;
  title:        string;
  description:  string;
  videoIds:     string[];
  createdAt:    string;
}

const KEY = "rasta_studio_sessions";

function load(): StudioSession[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(sessions: StudioSession[]) {
  sessionStorage.setItem(KEY, JSON.stringify(sessions));
}

export function useStudioSessions(instructorId: string) {
  const [all, setAll] = useState<StudioSession[]>(load);

  const sessions = all.filter((s) => s.instructorId === instructorId);

  const create = useCallback((title: string, description: string, videoIds: string[]) => {
    const session: StudioSession = {
      id:           `sess-${Date.now()}`,
      instructorId,
      title:        title.trim(),
      description:  description.trim(),
      videoIds,
      createdAt:    new Date().toISOString(),
    };
    const updated = [...load(), session];
    persist(updated);
    setAll(updated);
    return session;
  }, [instructorId]);

  const update = useCallback((id: string, title: string, description: string, videoIds: string[]) => {
    const updated = load().map((s) =>
      s.id === id ? { ...s, title: title.trim(), description: description.trim(), videoIds } : s
    );
    persist(updated);
    setAll(updated);
  }, []);

  const remove = useCallback((id: string) => {
    const updated = load().filter((s) => s.id !== id);
    persist(updated);
    setAll(updated);
  }, []);

  const addVideo = useCallback((sessionId: string, videoId: string) => {
    const updated = load().map((s) =>
      s.id === sessionId && !s.videoIds.includes(videoId)
        ? { ...s, videoIds: [...s.videoIds, videoId] }
        : s
    );
    persist(updated);
    setAll(updated);
  }, []);

  const removeVideo = useCallback((sessionId: string, videoId: string) => {
    const updated = load().map((s) =>
      s.id === sessionId ? { ...s, videoIds: s.videoIds.filter((v) => v !== videoId) } : s
    );
    persist(updated);
    setAll(updated);
  }, []);

  return { sessions, create, update, remove, addVideo, removeVideo };
}
