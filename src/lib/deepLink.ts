/**
 * Converte a URL que o sistema entregou ao app (App Link / esquema próprio) num
 * caminho interno para o React Router.
 *
 * Só o caminho, a query e o hash são aproveitados — o host é ignorado de
 * propósito. O cuidado é com o começo do caminho: `https://dominio//evil.com`
 * tem `pathname` igual a `//evil.com`, e o router trata um caminho que começa com
 * `//` (ou `/\`, que o navegador lê como `//`) como endereço de outro site. É o
 * vetor do open redirect do react-router 6.30.2–6.30.5. Colapsar as barras
 * iniciais garante que o resultado seja sempre uma rota do próprio app.
 */
export function toInternalPath(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // Caracteres de controle não têm lugar numa rota.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(rawUrl)) return null;

  // Só o início do caminho é reescrito. URL sem caminho (ex.: esquema próprio com
  // `#token`) segue como antes: o resultado é só `?query`/`#hash` e a rota atual
  // é mantida; sem nada, vai para a home.
  const pathname = url.pathname.replace(/^[/\\]+/, "/");
  return pathname + url.search + url.hash || "/";
}
