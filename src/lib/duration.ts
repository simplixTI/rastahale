/** Soma durações no formato "mm:ss" e devolve o total em minutos. */
export function totalMinutes(durations: string[]): number {
  return durations.reduce((sum, d) => {
    const [m = 0, s = 0] = (d ?? "").split(":").map(Number);
    return sum + (m || 0) + (s || 0) / 60;
  }, 0);
}

/** Formata minutos como "1h 20min" / "45min". */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
