import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, ImageIcon, Video as VideoIcon, X, Loader2, LinkIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { videoCategories, type Video } from "@/data/mockData";
import { useModules, moduleNames } from "@/hooks/useModules";
import { useModalities } from "@/hooks/useModalities";
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

async function uploadToStorage(
  file: File,
  folder: "thumbnails" | "videos",
  onProgress?: (pct: number) => void,
): Promise<string | null> {
  const path = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    upsert: false,
    // onUploadProgress é suportado pelo Supabase Storage JS v2 para uploads TUS (> 6 MB)
    onUploadProgress: onProgress
      ? ({ loaded, total }: { loaded: number; total: number }) => {
          if (total) onProgress(Math.round((loaded / total) * 100));
        }
      : undefined,
  };
  const { error } = await supabase.storage.from("media").upload(path, file, options);
  if (error) return null;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

const schema = z.object({
  title:            z.string().min(3,  "Mínimo 3 caracteres"),
  description:      z.string().min(10, "Mínimo 10 caracteres"),
  thumbnail:        z.string().min(1,  "Adicione uma thumbnail"),
  videoUrl:         z.string().optional(),
  duration:         z.string().min(1,  "Ex: 12:30"),
  category:         z.string().min(1,  "Selecione a modalidade"),
  subcategory:      z.string().min(1,  "Selecione"),
  level:            z.enum(["Iniciante", "Intermediário", "Avançado"]),
  instructorId:     z.string().min(1,  "Selecione"),
  visible:          z.boolean(),
  unlockByProgress: z.boolean(),
  requiredProgress: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;
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
}

function UploadZone({ accept, label, hint, uploading, progress = 0, fileName, onFile }: UploadZoneProps) {
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
        if (file) onFile(file);
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
      category: "jiu-jitsu", subcategory: videoCategories[0],
      level: "Iniciante", instructorId: instructors[0]?.id ?? "",
      visible: true, unlockByProgress: false, requiredProgress: 50,
    },
  });

  const { data: modules = [] }       = useModules();
  const { data: modalities = [] }    = useModalities();
  const selectedCategory = watch("category");
  // Módulos da modalidade selecionada (fallback para a lista fixa se vazio).
  const subOptions = (() => {
    const names = moduleNames(modules, selectedCategory);
    return names.length ? names : [...videoCategories];
  })();

  // Ao TROCAR de modalidade, o módulo (subcategoria) atual pode não existir na
  // nova modalidade — o <select> mostra a 1ª opção mas o valor do form ficaria
  // com o antigo (salvando o módulo errado). Reseta para a 1ª opção válida.
  // Ignora a 1ª execução após abrir (para não sobrescrever a subcategoria de um
  // vídeo em edição).
  const prevCategory = useRef<string | undefined>(undefined);
  const currentSub   = watch("subcategory");
  useEffect(() => {
    if (!open) { prevCategory.current = undefined; return; }
    if (prevCategory.current === undefined) { prevCategory.current = selectedCategory; return; }
    if (prevCategory.current !== selectedCategory) {
      prevCategory.current = selectedCategory;
      if (subOptions.length && !subOptions.includes(currentSub)) {
        setValue("subcategory", subOptions[0], { shouldValidate: true });
      }
    }
  }, [selectedCategory, open, currentSub, subOptions, setValue]);

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

  useEffect(() => {
    if (open) {
      setThumbMode("url");
      setVideoMode("url");
      setVideoFileName("");
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
              category: "jiu-jitsu", subcategory: videoCategories[0],
              level: "Iniciante", instructorId: instructors[0]?.id ?? "",
              visible: true, unlockByProgress: false, requiredProgress: 50,
            }
      );
    }
  }, [open, video, reset, instructors]);

  const unlockByProgress = watch("unlockByProgress");
  const thumbValue       = watch("thumbnail");
  const videoValue       = watch("videoUrl");
  const durationValue    = watch("duration");

  async function handleThumbFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem (PNG, JPG, WEBP)"); return; }
    if (file.size > 10 * 1024 * 1024)    { toast.error("Imagem muito grande (máx. 10 MB)"); return; }
    setThumbUploading(true);
    setThumbProgress(0);
    try {
      let url: string;
      if (isMockMode()) {
        // Blob URL — funciona em memória para qualquer tamanho
        url = URL.createObjectURL(file);
        setThumbProgress(100);
      } else {
        url = (await uploadToStorage(file, "thumbnails", setThumbProgress)) ?? "";
        if (!url) { toast.error("Erro ao enviar thumbnail"); return; }
      }
      setValue("thumbnail", url, { shouldValidate: true });
    } finally {
      setThumbUploading(false);
    }
  }

  async function handleVideoFile(file: File) {
    if (!file.type.startsWith("video/")) { toast.error("Selecione um arquivo de vídeo"); return; }
    // Sem limite de tamanho: mock usa blob URL (streaming local), Supabase usa TUS para arquivos grandes
    setVideoUploading(true);
    setVideoProgress(0);
    try {
      let url: string;
      if (isMockMode()) {
        url = URL.createObjectURL(file);
        setVideoProgress(100);
      } else {
        url = (await uploadToStorage(file, "videos", setVideoProgress)) ?? "";
        if (!url) { toast.error("Erro ao enviar vídeo"); return; }
      }
      setValue("videoUrl", url, { shouldValidate: true });
      setVideoFileName(file.name);

      // Arquivo enviado: a duração sai dos metadados do próprio vídeo.
      const dur = await getVideoDurationFromFile(file);
      if (dur) setValue("duration", dur, { shouldValidate: true });
    } finally {
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">

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
          {videoMode === "file" ? (
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
                <p className="mt-0.5 text-[10px] text-muted-foreground">YouTube, Vimeo ou link direto de MP4</p>
              </>
            ) : (
              <UploadZone
                accept="video/*"
                label="Clique ou arraste um vídeo"
                hint="MP4, MOV, AVI, MKV • sem limite de tamanho"
                uploading={videoUploading}
                progress={videoProgress}
                fileName={videoFileName || undefined}
                onFile={handleVideoFile}
              />
            )}

            {videoValue && videoFileName && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <VideoIcon size={13} className="shrink-0 text-emerald-400" />
                <p className="flex-1 truncate text-[10px] text-emerald-400">{videoFileName}</p>
                <button
                  type="button"
                  onClick={() => { setValue("videoUrl", ""); setVideoFileName(""); }}
                >
                  <X size={11} className="text-emerald-400" />
                </button>
              </div>
            )}
            {errors.videoUrl && <p className="mt-0.5 text-[10px] text-red-400">{errors.videoUrl.message}</p>}
          </div>

          {/* Modalidade / Subcategoria */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Modalidade</label>
              <select {...register("category")} className={fieldCls}>
                {modalities.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Módulo</label>
              <select {...register("subcategory")} className={fieldCls}>
                {subOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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
                <select {...register("instructorId")} className={fieldCls}>
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
