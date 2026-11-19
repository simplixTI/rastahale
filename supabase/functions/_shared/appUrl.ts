// Para onde o Stripe devolve o aluno depois do checkout / portal.
//
// Antes, a função aceitava o cabeçalho Origin de qualquer chamador e montava
// success_url / return_url com ele. Origin é escolhido por quem chama, então o
// retorno do Stripe podia apontar para um site de terceiros. Agora só voltam
// origens conhecidas; qualquer outra cai no APP_URL (ou no domínio de produção).
//
// Sem imports de propósito: roda no Deno (Edge Function) e no Vitest.

export const DEFAULT_APP_URL = "https://www.rastahalevirtualacademy.com";

/** Origens que podem receber o aluno de volta. localhost:8080 é o dev server. */
export const ALLOWED_APP_ORIGINS: readonly string[] = [
  "https://www.rastahalevirtualacademy.com",
  "https://rastahalevirtualacademy.com",
  "http://localhost:8080",
];

function toOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const { origin } = new URL(value);
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

export function pickAppUrl(input: {
  origin: string | null;
  referer: string | null;
  envAppUrl?: string | null;
}): string {
  const fallback = toOrigin(input.envAppUrl) ?? DEFAULT_APP_URL;
  const allowed = new Set<string>([...ALLOWED_APP_ORIGINS, fallback]);

  for (const candidate of [input.origin, input.referer]) {
    const origin = toOrigin(candidate);
    if (origin && allowed.has(origin)) return origin;
  }
  return fallback;
}
