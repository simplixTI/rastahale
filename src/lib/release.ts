/**
 * Liberação agendada de aulas (videos.release_at, migration 021).
 *
 * Antes da data, o aluno vê a aula em cinza com "Em breve" e não consegue
 * tocar; a equipe (admin/professor) assiste normalmente para conferir. A mesma
 * regra é aplicada no servidor pela Edge Function "bunny-stream".
 */
export function isUpcoming(releaseAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!releaseAt) return false;
  const at = Date.parse(releaseAt);
  return Number.isFinite(at) && at > now;
}

/** "25/11, 18:00" no idioma do aparelho. */
export function formatRelease(releaseAt: string, locale?: string): string {
  return new Date(releaseAt).toLocaleString(locale, {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

/** ISO do banco → valor de <input type="datetime-local"> (hora local). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> → ISO, ou null quando vazio. */
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Liberação agendada de módulos (studio_sessions.release_at, migration 023).
 * Devolve a data em que a aula sai da trava dos módulos, ou null se ela não
 * está presa: a trava só vale quando TODOS os módulos que contêm a aula ainda
 * não chegaram na data. Mesma regra da função SQL lesson_module_release.
 */
export function moduleReleaseGate(
  lessonId: string,
  modules: { videoIds: string[]; releaseAt: string | null }[],
  now: number = Date.now(),
): string | null {
  const containing = modules.filter((m) => m.videoIds.includes(lessonId));
  if (containing.length === 0) return null;
  if (!containing.every((m) => isUpcoming(m.releaseAt, now))) return null;
  return containing
    .map((m) => m.releaseAt as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

/** A data mais tarde entre a da aula e a dos módulos dela (null = liberada). */
export function laterRelease(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
