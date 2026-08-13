/** Soma durações no formato "mm:ss" e devolve o total em minutos. */
export function totalMinutes(durations: string[]): number {
  return durations.reduce((sum, d) => {
    const [m = 0, s = 0] = (d ?? "").split(":").map(Number);
    return sum + (m || 0) + (s || 0) / 60;
  }, 0);
}

// A formatação de duração ("1h 20min") vive em `useLabels().duration` — precisa
// das unidades traduzidas, então depende do idioma ativo.
