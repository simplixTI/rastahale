import { Upload, type DetailedError } from "tus-js-client";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

const BUCKET = "media";

// O Supabase exige chunks de exatamente 6 MB no upload resumível (TUS).
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

/**
 * Erro de upload com mensagem pronta para o toast. `cancelled` = o usuário
 * cancelou (ou fechou o modal) — não é falha e não deve virar toast de erro.
 */
export class UploadError extends Error {
  constructor(message: string, readonly cancelled = false) {
    super(message);
    this.name = "UploadError";
  }
}

export interface UploadOptions {
  /** Porcentagem 0–100 dos bytes já enviados. */
  onProgress?: (pct: number) => void;
  /** Abortar interrompe o envio; reenviar o mesmo arquivo retoma de onde parou. */
  signal?: AbortSignal;
}

/**
 * Nome de objeto aceito pelo Storage. Ele recusa acentos e símbolos com
 * "InvalidKey" (ex: "Guarda — Básico.mp4"); antes só os espaços eram trocados.
 */
export function storageSafeName(name: string): string {
  const safe = name
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // "Básico" → "Basico"
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+/, "");
  return safe || "arquivo";
}

function formatMB(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function friendlyMessage(file: File, status: number | undefined, detail: string): string {
  if (status === 413 || /maximum size|maximum allowed size|payload too large/i.test(detail)) {
    return `O arquivo tem ${formatMB(file.size)} e passa do limite de upload do Supabase. ` +
      `Aumente o "Upload file size limit" no painel do Supabase (Storage → Settings) ou envie um arquivo menor.`;
  }
  if (status === 401 || status === 403 || /row-level security|unauthorized|jwt/i.test(detail)) {
    return "Sem permissão para enviar arquivos. Entre novamente com uma conta de admin.";
  }
  if (!status) {
    return "A conexão caiu durante o envio. Selecione o mesmo arquivo de novo — o envio continua de onde parou.";
  }
  return `Erro ${status} ao enviar o arquivo${detail ? `: ${detail}` : ""}`;
}

/** URL direta do Storage (*.storage.supabase.co): recomendada pelo Supabase para arquivos grandes. */
function resumableEndpoint(): string {
  const direct = supabaseUrl.replace(/^(https:\/\/[a-z0-9]+)\.supabase\.co\/?$/, "$1.storage.supabase.co");
  return `${direct.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

async function accessToken(): Promise<string> {
  // getSession renova o token se tiver expirado — importante em envios longos.
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? supabaseAnonKey;
}

function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Arquivos pequenos (≤ 6 MB): um único POST basta. */
async function standardUpload(file: File, path: string, { onProgress, signal }: UploadOptions): Promise<string> {
  onProgress?.(0);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  // O POST único não é interrompível; só descarta o resultado se cancelado.
  if (signal?.aborted) throw new UploadError("Envio cancelado", true);
  if (error) {
    throw new UploadError(friendlyMessage(file, (error as { status?: number }).status, error.message));
  }
  onProgress?.(100);
  return publicUrl(path);
}

/**
 * Arquivos grandes: upload resumível (TUS) em chunks de 6 MB, com progresso
 * real, novas tentativas automáticas e retomada após queda de conexão.
 *
 * O upload padrão (`storage.upload`) manda o arquivo inteiro num único POST e
 * não tem callback de progresso — a tela ficava em "Enviando… 0%" por minutos
 * e, acima do limite do projeto, só falhava no fim. Aqui o servidor recusa
 * logo na criação do upload (o tamanho vai no cabeçalho Upload-Length).
 */
function resumableUpload(file: File, path: string, { onProgress, signal }: UploadOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new UploadError("Envio cancelado", true)); return; }

    const upload = new Upload(file, {
      endpoint: resumableEndpoint(),
      chunkSize: TUS_CHUNK_SIZE,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { apikey: supabaseAnonKey, "x-upsert": "false" },
      metadata: {
        bucketName:   BUCKET,
        objectName:   path,
        contentType:  file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onBeforeRequest: async (req) => {
        req.setHeader("authorization", `Bearer ${await accessToken()}`);
      },
      // 4xx (limite de tamanho, permissão, nome inválido) não melhora tentando de novo.
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
        resolve(publicUrl(path));
      },
      onError: (err) => {
        signal?.removeEventListener("abort", onAbort);
        const res    = (err as DetailedError).originalResponse;
        const status = res?.getStatus() || undefined;
        // 409 = este mesmo arquivo já foi enviado antes (o caminho é derivado
        // dele) — reaproveita o objeto existente em vez de falhar.
        if (status === 409) { onProgress?.(100); resolve(publicUrl(path)); return; }
        reject(new UploadError(friendlyMessage(file, status, res?.getBody() || err.message)));
      },
    });

    function onAbort() {
      upload.abort().catch(() => { /* já interrompido */ });
      reject(new UploadError("Envio cancelado", true));
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    // Se este arquivo já começou a subir antes (conexão caiu, aba recarregada),
    // continua de onde parou em vez de reenviar tudo.
    upload.findPreviousUploads()
      .catch(() => [])
      .then((previous) => {
        if (signal?.aborted) return;
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      });
  });
}

/**
 * Envia um arquivo ao bucket "media" e devolve a URL pública.
 * Lança `UploadError` com uma mensagem já pronta para exibir.
 */
export async function uploadMedia(file: File, folder: string, options: UploadOptions = {}): Promise<string> {
  const name = storageSafeName(file.name);
  if (file.size <= TUS_CHUNK_SIZE) {
    return standardUpload(file, `${folder}/${Date.now()}_${name}`, options);
  }
  // Caminho estável por arquivo (data de modificação + tamanho + nome) para a
  // retomada cair no mesmo objeto do envio interrompido.
  return resumableUpload(file, `${folder}/${file.lastModified}_${file.size}_${name}`, options);
}
