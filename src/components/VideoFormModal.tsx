import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, ImageIcon, Video as VideoIcon, X, Loader2, LinkIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase";
import { uploadMedia, UploadError } from "@/lib/storageUpload";
import { bunnyVideoIdFromUrl, deleteBunnyVideo, isBunnyConfigured, uploadVideoToBunny } from "@/lib/bunnyStream";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Video } from "@/data/mockData";
import { useModules, moduleNames, modalityOfModule, DEFAULT_MODALITY } from "@/hooks/useModules";
import { useInstructors } from "@/hooks/useInstructors";

// Modo demo = Supabase não configurado. O instrutor loga com id "inst-…" (não
// UUID); a heurística de UUID marcaria a sessão como mock e o upload usaria
// createObjectURL (não persiste) em vez do Supabase Storage.
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

/** Extrai a duração (mm:ss) de um arquivo de vídeo lendo os metadados no navegador. */
function getVideoDurationFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const total = Math.round(v.duration);
        if (!isFinite(total) || total <= 0) { resolve(""); return; }
        const min = Math.floor(total / 60);
        const sec = total % 60;
        resolve(`${min}:${String(sec).padStart(2, "0")}`);
      };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
      v.src = url;
    } catch { resolve(""); }
  });
}

// O Windows/Chrome às vezes entrega MKV/AVI com file.type vazio.
const VIDEO_EXT = /\.(mp4|m4v|mov|avi|mkv|webm)$/i;

function uploadErrorToast(err: unknown, fallback: string) {
  if (err instanceof UploadError && err.cancelled) return;
  toast.error(err instanceof Error && err.message ? err.message : fallback, { duration: 10000 });
}

const schema = z.object({
  title:            z.string().min(3,  "Mínimo 3 caracteres"),
  description:      z.string().min(10, "Mínimo 10 caracteres"),
  thumbnail:        z.string().min(1,  "Adicione uma thumbnail"),
  videoUrl:         z.string().optional(),
  duration:         z.string().min(1,  "Ex: 12:30"),
  category:         z.string(), // interno: herdado da categoria ao salvar
  subcategory:      z.string().min(1,  "Selecione uma categoria"),
  level:            z.enum(["Iniciante", "Intermediário", "Avançado"]),
  instructorId:     z.string().min(1,  "Selecione"),
  visible:          z.boolean(),
  unlockByProgress: z.boolean(),
  requiredProgress: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  title: "Título", description: "Descrição", thumbnail: "Thumbnail", videoUrl: "Vídeo", duration: "Duração",
  subcategory: "Categoria", level: "Nível", instructorId: "Instrutor", requiredProgress: "Progresso mínimo",
};

type VideoWithUrl = Video & { videoUrl?: string | null };

interface Props {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  video?:         VideoWithUrl | null;
  onSubmit:       (values: FormValues) => void;
  isPending?:     boolean;
  onDelete?:      () => void;
  isDeleting?:    boolean;
  /** Oculta o seletor de instrutor (ex: Studio — o dono é o próprio professor). */
  hideInstructor?: boolean;
}

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

// ── UploadZone ────────────────────────────────────────────────────────────────
interface UploadZoneProps {
  accept:     string;
  label:      string;
  hint:       string;
  uploading:  boolean;
  progress?:  number;
  fileName?:  string;
  onFile:     (file: File) => void;
  onCancel?:  () => void;
}

function UploadZone({ accept, label, hint, uploading, progress = 0, fileName, onFile, onCancel }: UploadZoneProps) {
  const inputRef                = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !uploading) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 transition-colors select-none",
        uploading && "cursor-default",
        dragging  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50 hover:border-primary/50 hover:bg-secondary"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />

      {uploading
        ? <Loader2 size={22} className="animate-spin text-primary" />
        : <Upload size={22} className={cn("transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
      }

      <div className="w-full text-center">
        <p className="text-[11px] font-semibold text-foreground">
          {uploading ? `Enviando… ${progress}%` : fileName ?? label}
        </p>
        {!uploading && !fileName && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
        )}
      </div>

      {uploading && progress > 0 && (
        <div className="w-full overflow-hidden rounded-full bg-secondary h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {uploading && onCancel && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="text-[10px] font-medium text-muted-foreground underline hover:text-foreground"
        >
          Cancelar envio
        </button>
      )}
    </div>
  );
}

// ── ModeTabs ──────────────────────────────────────────────────────────────────
function ModeTabs({ mode, onChange }: { mode: "url" | "file"; onChange: (m: "url" | "file") => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {(["url", "file"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors",
            mode === m
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "url"
            ? <><LinkIcon size={10} /> URL</>
            : <><Upload size={10} /> Arquivo</>
          }
        </button>
      ))}
    </div>
  );
}

// ── VideoFormModal ────────────────────────────────────────────────────────────
export default function VideoFormModal({ open, onOpenChange, video, onSubmit, isPending, onDelete, isDeleting, hideInstructor }: Props) {
  const isEdit = !!video;

  // Instrutores REAIS do banco (antes era a lista fixa do mockData, que não
  // incluía os instrutores criados no admin — impedia vincular aulas a eles).
  // Declarado ANTES do useForm porque os defaultValues o utilizam.
  const { data: instructors = [] }   = useInstructors();

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", description: "", thumbnail: "", videoUrl: "", duration: "",
      category: DEFAULT_MODALITY, subcategory: "",
      level: "Iniciante", instructorId: instructors[0]?.id ?? "",
      visible: true, unlockByProgress: false, requiredProgress: 50,
    },
  });

  // Categoria = um dos módulos cadastrados (lista única, sem modalidade por
  // cima). Fica em `subcategory`; a modalidade interna (`category`) é herdada
  // do módulo escolhido na hora de salvar.
  const { data: modules = [], isSuccess: modulesLoaded } = useModules();
  const currentSub = watch("subcategory");
  // Na edição, uma categoria que já foi removida continua listada — senão o
  // vídeo trocaria de categoria ao salvar sem o admin perceber.
  const categoryOptions = (() => {
    const names = moduleNames(modules);
    return isEdit && currentSub && !names.includes(currentSub) ? [currentSub, ...names] : names;
  })();

  // Vídeo novo: pré-seleciona a 1ª categoria assim que a lista chega. O valor
  // precisa estar no form — antes o <select> exibia a 1ª opção, mas o form
  // gravava um padrão escondido (tela mostrava "Wrestling", salvava "Fundamentos").
  useEffect(() => {
    if (!open || isEdit) return;
    if (categoryOptions.length && !categoryOptions.includes(currentSub)) {
      setValue("subcategory", categoryOptions[0], { shouldValidate: true });
    }
  }, [open, isEdit, categoryOptions, currentSub, setValue]);

  // Os instrutores chegam de forma assíncrona: se o valor atual estiver vazio ou
  // apontar para um instrutor que não existe mais (ex: removido), seleciona o
  // primeiro válido. Não mexe quando o valor já é um instrutor existente.
  const currentInstructor = watch("instructorId");
  useEffect(() => {
    if (!open || instructors.length === 0) return;
    if (!currentInstructor || !instructors.some((i) => i.id === currentInstructor)) {
      setValue("instructorId", instructors[0].id, { shouldValidate: true });
    }
  }, [open, instructors, currentInstructor, setValue]);

  const [thumbMode,      setThumbMode]      = useState<"url" | "file">("url");
  const [videoMode,      setVideoMode]      = useState<"url" | "file">("url");
  const [thumbUploading, setThumbUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoFileName,  setVideoFileName]  = useState<string>("");
  const [thumbProgress,  setThumbProgress]  = useState(0);
  const [videoProgress,  setVideoProgress]  = useState(0);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  // A duração não saiu dos metadados (MKV/AVI costumam não abrir no navegador):
  // o campo vira digitável, senão não haveria como preencher e salvar.
  const [durationFailed, setDurationFailed] = useState(false);
  const thumbAbort = useRef<AbortController | null>(null);
  const videoAbort = useRef<AbortController | null>(null);
  // Vídeo enviado ao Bunny neste formulário e ainda não confirmado numa aula salva.
  const unsavedBunnyId = useRef<string | null>(null);

  /** Remove do Bunny o vídeo enviado aqui que acabou não sendo usado em nenhuma aula. */
  const discardUnsavedBunnyVideo = useCallback(() => {
    const id = unsavedBunnyId.current;
    unsavedBunnyId.current = null;
    if (id) deleteBunnyVideo(id).catch(() => { /* fica órfão — não aparece para o aluno */ });
  }, []);

  // Fechar o modal (ou sair da página) interrompe envios em andamento — antes
  // o upload seguia em segundo plano e o resultado se perdia.
  useEffect(() => {
    if (open) return;
    thumbAbort.current?.abort();
    videoAbort.current?.abort();
    discardUnsavedBunnyVideo();
  }, [open, discardUnsavedBunnyVideo]);
  useEffect(() => () => {
    thumbAbort.current?.abort();
    videoAbort.current?.abort();
    discardUnsavedBunnyVideo();
  }, [discardUnsavedBunnyVideo]);

  useEffect(() => {
    if (open) {
      setThumbMode("url");
      setVideoMode("url");
      setVideoFileName("");
      setDurationFailed(false);
      setThumbProgress(0);
      setVideoProgress(0);
      setConfirmDelete(false);
      reset(
        video
          ? {
              title: video.title, description: video.description,
              thumbnail: video.thumbnail, videoUrl: video.videoUrl ?? "",
              duration: video.duration, category: video.category,
              subcategory: video.subcategory, level: video.level,
              instructorId: video.instructorId,
              visible: video.visible ?? true,
              unlockByProgress: video.unlockByProgress ?? false,
              requiredProgress: video.requiredProgress ?? 50,
            }
          : {
              title: "", description: "", thumbnail: "", videoUrl: "", duration: "",
              category: DEFAULT_MODALITY, subcategory: "",
              // Precisa vir preenchido aqui: este reset roda depois do efeito de
              // instrutores acima e, sem o <select> na tela (Studio), o campo
              // ficava vazio e a validação reprovava sem nada aparecer.
              level: "Iniciante", instructorId: instructors[0]?.id ?? "",
              visible: true, unlockByProgress: false, requiredProgress: 50,
            }
      );
    }
    // Só ao abrir/trocar de vídeo. Depender de `instructors` resetava o
    // formulário quando a lista chegava ou era recarregada — com o modal já
    // em uso, apagava o que foi digitado e escondia o upload em andamento.
  }, [open, video, reset]);

  const unlockByProgress = watch("unlockByProgress");
  const thumbValue       = watch("thumbnail");
  const videoValue       = watch("videoUrl");
  const durationValue    = watch("duration");

  async function handleThumbFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem (PNG, JPG, WEBP)"); return; }
    if (file.size > 10 * 1024 * 1024)    { toast.error("Imagem muito grande (máx. 10 MB)"); return; }
    const controller = new AbortController();
    thumbAbort.current = controller;
    setThumbUploading(true);
    setThumbProgress(0);
    try {
      let url: string;
      if (isMockMode()) {
        // Blob URL — funciona em memória para qualquer tamanho
        url = URL.createObjectURL(file);
        setThumbProgress(100);
      } else {
        url = await uploadMedia(file, "thumbnails", { onProgress: setThumbProgress, signal: controller.signal });
      }
      setValue("thumbnail", url, { shouldValidate: true });
    } catch (err) {
      uploadErrorToast(err, "Erro ao enviar thumbnail");
    } finally {
      if (thumbAbort.current === controller) thumbAbort.current = null;
      setThumbUploading(false);
    }
  }

  async function handleVideoFile(file: File) {
    if (!file.type.startsWith("video/") && !VIDEO_EXT.test(file.name)) { toast.error("Selecione um arquivo de vídeo"); return; }
    // A duração sai dos metadados do próprio arquivo — lida já na seleção para
    // aparecer enquanto o envio (que pode levar minutos) ainda está rodando.
    setDurationFailed(false);
    getVideoDurationFromFile(file).then((dur) => {
      if (dur) setValue("duration", dur, { shouldValidate: true });
      else setDurationFailed(true);
    });
    const controller = new AbortController();
    videoAbort.current = controller;
    setVideoUploading(true);
    setVideoProgress(0);
    try {
      let url: string;
      if (isMockMode()) {
        url = URL.createObjectURL(file);
        setVideoProgress(100);
      } else if (isBunnyConfigured) {
        // Bunny Stream: converte para HLS (qualidade adaptativa) e entrega pela CDN.
        url = await uploadVideoToBunny(file, { onProgress: setVideoProgress, signal: controller.signal });
        discardUnsavedBunnyVideo(); // este envio substitui o anterior, se houver
        unsavedBunnyId.current = bunnyVideoIdFromUrl(url);
        toast.success("Vídeo enviado. O Bunny leva alguns minutos para processá-lo antes de ficar disponível.", { duration: 8000 });
      } else {
        // Arquivos grandes sobem em partes (TUS), com progresso real e retomada.
        url = await uploadMedia(file, "videos", { onProgress: setVideoProgress, signal: controller.signal });
      }
      setValue("videoUrl", url, { shouldValidate: true });
      setVideoFileName(file.name);
    } catch (err) {
      uploadErrorToast(err, "Erro ao enviar vídeo");
    } finally {
      if (videoAbort.current === controller) videoAbort.current = null;
      setVideoUploading(false);
    }
  }

  const busy = thumbUploading || videoUploading || !!isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEdit ? "Editar Vídeo" : "Adicionar Vídeo"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => {
            // A partir daqui o vídeo pertence à aula: o modal pode fechar antes de
            // o banco responder, e esse fechamento não pode apagá-lo do Bunny.
            unsavedBunnyId.current = null;
            // A modalidade interna acompanha a categoria escolhida.
            onSubmit({ ...values, category: modalityOfModule(modules, values.subcategory, values.category || DEFAULT_MODALITY) });
          }, (invalid) => {
            // Sem isto, um campo fora da tela reprovava e o botão parecia não fazer nada.
            const fields = Object.keys(invalid).map((f) => FIELD_LABELS[f as keyof FormValues] ?? f);
            toast.error(`Confira: ${fields.join(", ")}`);
          })}
          className="space-y-3 pt-1"
        >

          {/* Título */}
          <div>
            <label className={labelCls}>Título</label>
            <input {...register("title")} className={fieldCls} placeholder="Ex: Guarda Fechada — Fundamentos" />
            {errors.title && <p className="mt-0.5 text-[10px] text-red-400">{errors.title.message}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea {...register("description")} rows={2} className={cn(fieldCls, "resize-none")} placeholder="Descreva o conteúdo da aula…" />
            {errors.description && <p className="mt-0.5 text-[10px] text-red-400">{errors.description.message}</p>}
          </div>

          {/* Thumbnail */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={cn(labelCls, "mb-0 flex items-center gap-1")}>
                <ImageIcon size={11} /> Thumbnail
              </label>
              <ModeTabs mode={thumbMode} onChange={setThumbMode} />
            </div>

            {thumbMode === "url" ? (
              <input {...register("thumbnail")} className={fieldCls} placeholder="https://..." />
            ) : (
              <UploadZone
                accept="image/*"
                label="Clique ou arraste uma imagem"
                hint="PNG, JPG, WEBP • máx. 10 MB"
                uploading={thumbUploading}
                progress={thumbProgress}
                onFile={handleThumbFile}
                onCancel={() => thumbAbort.current?.abort()}
              />
            )}

            {thumbValue && (
              <div className="relative mt-1.5 h-28 w-full overflow-hidden rounded-lg border border-border">
                <img
                  src={thumbValue}
                  alt="preview"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setValue("thumbnail", "", { shouldValidate: true })}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            )}
            {errors.thumbnail && <p className="mt-0.5 text-[10px] text-red-400">{errors.thumbnail.message}</p>}
          </div>

          {/* Duração — automática quando o vídeo é um arquivo enviado; digitada
              quando é uma URL (não dá para ler os metadados de link externo). */}
          {videoMode === "file" && !durationFailed ? (
            <div>
              <label className={labelCls}>Duração</label>
              <div className={cn(fieldCls, "flex items-center")}>
                {durationValue
                  ? <span className="text-foreground">{durationValue}</span>
                  : <span className="text-muted-foreground">Detectada automaticamente do vídeo</span>}
              </div>
              {errors.duration && <p className="mt-0.5 text-[10px] text-red-400">{errors.duration.message}</p>}
            </div>
          ) : (
            <div>
              <label className={labelCls}>Duração</label>
              <input {...register("duration")} className={fieldCls} placeholder="12:30" />
              {errors.duration && <p className="mt-0.5 text-[10px] text-red-400">{errors.duration.message}</p>}
            </div>
          )}

          {/* Vídeo */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={cn(labelCls, "mb-0 flex items-center gap-1")}>
                <VideoIcon size={11} /> Vídeo
              </label>
              <ModeTabs mode={videoMode} onChange={setVideoMode} />
            </div>

            {videoMode === "url" ? (
              <>
                <input {...register("videoUrl")} className={fieldCls} placeholder="https://youtube.com/watch?v=… ou URL direta" />
                <p className="mt-0.5 text-[10px] text-muted-foreground">YouTube, Vimeo ou link direto de MP4 / HLS (.m3u8)</p>
              </>
            ) : (
              <UploadZone
                accept="video/*"
                label="Clique ou arraste um vídeo"
                hint="MP4, MOV, AVI, MKV"
                uploading={videoUploading}
                progress={videoProgress}
                fileName={videoFileName || undefined}
                onFile={handleVideoFile}
                onCancel={() => videoAbort.current?.abort()}
              />
            )}

            {videoValue && videoFileName && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <VideoIcon size={13} className="shrink-0 text-emerald-400" />
                <p className="flex-1 truncate text-[10px] text-emerald-400">{videoFileName}</p>
                <button
                  type="button"
                  onClick={() => { discardUnsavedBunnyVideo(); setValue("videoUrl", ""); setVideoFileName(""); }}
                >
                  <X size={11} className="text-emerald-400" />
                </button>
              </div>
            )}
            {errors.videoUrl && <p className="mt-0.5 text-[10px] text-red-400">{errors.videoUrl.message}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className={labelCls}>Categoria</label>
            {/* Controlado (value): as opções chegam depois do reset; sem isso o
                select exibia uma opção diferente do valor que seria salvo. */}
            <select {...register("subcategory")} value={currentSub} className={fieldCls}>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {modulesLoaded && categoryOptions.length === 0 ? (
              <p className="mt-0.5 text-[10px] text-amber-400">Nenhuma categoria cadastrada — crie em Vídeos → Categorias.</p>
            ) : errors.subcategory && (
              <p className="mt-0.5 text-[10px] text-red-400">{errors.subcategory.message}</p>
            )}
          </div>

          {/* Nível / Instrutor */}
          <div className={cn("grid gap-2", hideInstructor ? "grid-cols-1" : "grid-cols-2")}>
            <div>
              <label className={labelCls}>Nível</label>
              <select {...register("level")} className={fieldCls}>
                <option>Iniciante</option>
                <option>Intermediário</option>
                <option>Avançado</option>
              </select>
            </div>
            {!hideInstructor && (
              <div>
                <label className={labelCls}>Instrutor</label>
                <select {...register("instructorId")} value={currentInstructor} className={fieldCls}>
                  {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-xs text-foreground">Visível para alunos</span>
              <input type="checkbox" {...register("visible")} className="accent-primary h-4 w-4" />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-xs text-foreground">Travado por progresso</span>
              <input type="checkbox" {...register("unlockByProgress")} className="accent-primary h-4 w-4" />
            </label>
            {unlockByProgress && (
              <div>
                <label className={labelCls}>Progresso mínimo (%)</label>
                <input
                  type="number"
                  {...register("requiredProgress")}
                  min={0} max={100}
                  className={fieldCls}
                  placeholder="50"
                />
                {errors.requiredProgress && <p className="mt-0.5 text-[10px] text-red-400">{errors.requiredProgress.message}</p>}
              </div>
            )}
          </div>

          {/* Excluir vídeo — só na edição */}
          {isEdit && onDelete && (
            <div className="border-t border-border pt-3">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={13} /> Excluir vídeo
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                  <span className="flex-1 text-[11px] text-red-400">Excluir permanentemente?</span>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={onDelete}
                    className="rounded-full btn-press bg-red-500 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                  >
                    {isDeleting ? "Excluindo…" : "Sim, excluir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {thumbUploading || videoUploading ? "Enviando…" : isPending ? "Salvando…" : isEdit ? "Salvar" : "Adicionar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
