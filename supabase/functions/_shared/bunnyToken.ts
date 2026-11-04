// Assinatura de URLs da CDN do Bunny (Token Authentication "HS256").
// Referência: github.com/BunnyWay/BunnyCDN.TokenAuthentication
//
// Para HLS o token vai no CAMINHO da URL e vale para a pasta inteira do vídeo:
// o player resolve as qualidades e os segmentos a partir do caminho da playlist,
// então eles herdam o token sozinhos. Token em query string não seria herdado.
//
// Usa só WebCrypto para rodar igual no Deno (Edge Function) e no Vitest.

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Devolve a URL da playlist assinada, válida até `expires` (UNIX, em segundos). */
export async function signBunnyPlaylistUrl(
  playlistUrl: string,
  securityKey: string,
  expires: number,
): Promise<string> {
  const { origin, pathname } = new URL(playlistUrl);
  const tokenPath = pathname.slice(0, pathname.lastIndexOf("/") + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(securityKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = `${tokenPath}${expires}token_path=${tokenPath}`;
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  const token = `HS256-${toBase64Url(digest)}`;
  return `${origin}/bcdn_token=${token}&token_path=${encodeURIComponent(tokenPath)}&expires=${expires}${pathname}`;
}
