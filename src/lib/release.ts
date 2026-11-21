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
