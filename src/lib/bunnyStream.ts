import { Upload, type DetailedError } from "tus-js-client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { UploadError, type UploadOptions } from "@/lib/storageUpload";

// Hostname da CDN da biblioteca (Bunny → Stream → biblioteca → API → "CDN Hostname").
// Aceita "vz-xxxx.b-cdn.net" ou a URL completa copiada do painel.
const CDN_HOSTNAME = (import.meta.env.VITE_BUNNY_STREAM_CDN_HOSTNAME ?? "")
  .trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

/**
 * true quando o Bunny Stream está configurado no .env. Sem ele, os vídeos
 * continuam indo para o bucket "media" do Supabase Storage.
 */
export const isBunnyConfigured = !!CDN_HOSTNAME;

const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

// Playlist HLS que o Bunny gera para cada vídeo: https://<cdn>/<guid>/playlist.m3u8
const BUNNY_PLAYLIST = /^https:\/\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/playlist\.m3u8(?:[?#].*)?$/i;

export function isHlsUrl(url: string): boolean {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

/** GUID do vídeo no Bunny a partir da URL salva em `video_url` (null se não for do Bunny). */
export function bunnyVideoIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(BUNNY_PLAYLIST)?.[1] ?? null;
}

interface UploadTicket {
  libraryId: string;
  videoId:   string;
  expire:    number;
  signature: string;
}

/** Chama a Edge Function "bunny-stream", que guarda a API key do Bunny. */
async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("bunny-stream", { body });
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    const detail = await error.context.json().then((b) => b?.error ?? "").catch(() => "");
    if (status === 401) throw new UploadError("Sem permissão para enviar vídeos. Entre novamente com uma conta de admin.");
    if (status === 404 && !detail) throw new UploadError('A função "bunny-stream" não está publicada no Supabase.');
    throw new UploadError(detail || `Erro ${status} no servidor de vídeos`);
  }
  throw new UploadError("Não foi possível falar com o servidor de vídeos. Verifique a conexão.");
}

function tusUpload(file: File, { libraryId, videoId, expire, signature }: UploadTicket, { onProgress, signal }: UploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new UploadError("Envio cancelado", true)); return; }

    const upload = new Upload(file, {
      endpoint:    TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      // Cada envio cria um vídeo novo no Bunny (outro VideoId), então não dá para
      // retomar o envio de uma sessão anterior — só as quedas durante este.
      storeFingerprintForResuming: false,
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire:    String(expire),
        VideoId:                videoId,
        LibraryId:              String(libraryId),
      },
      metadata: { filetype: file.type || "video/mp4", title: file.name },
      // 4xx (assinatura expirada, biblioteca errada) não melhora tentando de novo.
      onShouldRetry: (err) => {
        const status = err.originalResponse?.getStatus() ?? 0;
        return status === 0 || status >= 500 || status === 423 || status === 429;
      },
      onProgress: (sent, total) => {
        if (total) onProgress?.(Math.min(99, Math.floor((sent / total) * 100)));
      },
      onSuccess: () => {
        signal?.removeEventListener("abort", onAbort);
        onProgress?.(100);
        resolve();
      },
      onError: (err) => {
        signal?.removeEventListener("abort", onAbort);
        const res    = (err as DetailedError).originalResponse;
        const status = res?.getStatus() || undefined;
        const detail = res?.getBody() || "";
        reject(new UploadError(status
          ? `Erro ${status} ao enviar o vídeo ao Bunny${detail ? `: ${detail}` : ""}`
          : "A conexão caiu durante o envio. Selecione o vídeo de novo para reenviar."));
      },
    });

    function onAbort() {
      upload.abort().catch(() => { /* já interrompido */ });
      reject(new UploadError("Envio cancelado", true));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    upload.start();
  });
}

/**
 * Envia um vídeo ao Bunny Stream e devolve a URL HLS para salvar em `video_url`.
 * O arquivo vai direto do navegador ao Bunny (TUS); a Edge Function só assina
 * o envio. Depois do envio o Bunny ainda leva alguns minutos convertendo o vídeo.
 * Lança `UploadError` com uma mensagem já pronta para exibir.
 */
export async function uploadVideoToBunny(file: File, options: UploadOptions = {}): Promise<string> {
  if (options.signal?.aborted) throw new UploadError("Envio cancelado", true);
  options.onProgress?.(0);
  const ticket = await callFunction<UploadTicket>({ action: "create-upload", title: file.name });
  try {
    await tusUpload(file, ticket, options);
  } catch (err) {
    // O vídeo já existe no Bunny; sem o arquivo ficaria vazio na biblioteca.
    deleteBunnyVideo(ticket.videoId).catch(() => { /* fica órfão — não aparece para o aluno */ });
    throw err;
  }
  return `https://${CDN_HOSTNAME}/${ticket.videoId}/playlist.m3u8`;
}

/** Remove o vídeo do Bunny. A Edge Function recusa se alguma aula ainda o usa. */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  await callFunction({ action: "delete", videoId });
}
