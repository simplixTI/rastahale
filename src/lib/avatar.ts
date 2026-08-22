/**
 * Resolução de avatar com fallback local.
 *
 * Dois problemas que isto resolve:
 *
 * 1. `src` vazio. O Supabase devolve `avatar_url: null`, que os hooks
 *    normalizam para `""`. Como `??` só cai no fallback em null/undefined, a
 *    string vazia passava direto e virava `<img src="">` — e o navegador
 *    resolve src vazio para a URL da PÁGINA ATUAL, baixando o HTML como se
 *    fosse imagem. Resultado: ícone de imagem quebrada com o alt à mostra.
 *
 * 2. Fallback remoto. O padrão anterior era uma foto do Unsplash, o que faz o
 *    estado "sem avatar" depender de rede — no app Android, sem conexão, ele
 *    quebra do mesmo jeito. O default agora é um SVG embutido: sem requisição,
 *    funciona offline e não custa um arquivo a mais no bundle.
 */

// Silhueta neutra nas cores do tema. Aspas simples no SVG para caber na URI.
export const DEFAULT_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
      "<rect width='120' height='120' fill='#1c1c1c'/>" +
      "<circle cx='60' cy='46' r='21' fill='#4a4a4a'/>" +
      "<path d='M22 108c0-21 17-32 38-32s38 11 38 32z' fill='#4a4a4a'/>" +
      "</svg>"
  );

/**
 * Devolve o primeiro candidato que seja uma string não vazia; senão, o default.
 * Trata "" e espaços em branco como ausência de avatar — que é o ponto do
 * `??` que falhava.
 */
export function resolveAvatarUrl(
  ...candidates: (string | null | undefined)[]
): string {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "") return c;
  }
  return DEFAULT_AVATAR;
}

/**
 * Handler de onError para <img>: troca por um avatar válido quando a URL
 * remota morre (link podre, offline, host fora do ar). Limpa o próprio
 * onError antes de trocar para não entrar em laço se o default falhar.
 */
export function handleAvatarError(
  e: React.SyntheticEvent<HTMLImageElement, Event>
): void {
  const img = e.currentTarget;
  if (img.src === DEFAULT_AVATAR) return;
  img.onerror = null;
  img.src = DEFAULT_AVATAR;
}
