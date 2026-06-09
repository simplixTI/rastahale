import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { videoCategories, instructors, type Video } from "@/data/mockData";

const schema = z.object({
  title:            z.string().min(3,  "Mínimo 3 caracteres"),
  description:      z.string().min(10, "Mínimo 10 caracteres"),
  thumbnail:        z.string().url("URL inválida"),
  videoUrl:         z.string().url("URL inválida").or(z.literal("")).optional(),
  duration:         z.string().min(1,  "Ex: 12:30"),
  category:         z.enum(["jiu-jitsu", "luta-livre"]),
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
  open: boolean;
  onOpenChange: (v: boolean) => void;
  video?: VideoWithUrl | null;
  onSubmit: (values: FormValues) => void;
  isPending?: boolean;
}

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

export default function VideoFormModal({ open, onOpenChange, video, onSubmit, isPending }: Props) {
  const isEdit = !!video;

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:            "",
      description:      "",
      thumbnail:        "",
      videoUrl:         "",
      duration:         "",
      category:         "jiu-jitsu",
      subcategory:      videoCategories[0],
      level:            "Iniciante",
      instructorId:     instructors[0]?.id ?? "",
      visible:          true,
      unlockByProgress: false,
      requiredProgress: 50,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        video
          ? {
              title:            video.title,
              description:      video.description,
              thumbnail:        video.thumbnail,
              videoUrl:         video.videoUrl ?? "",
              duration:         video.duration,
              category:         video.category,
              subcategory:      video.subcategory,
              level:            video.level,
              instructorId:     video.instructorId,
              visible:          video.visible ?? true,
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
  }, [open, video, reset]);

  const unlockByProgress = watch("unlockByProgress");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEdit ? "Editar Vídeo" : "Adicionar Vídeo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div>
            <label className={labelCls}>Título</label>
            <input {...register("title")} className={fieldCls} placeholder="Ex: Guarda Fechada — Fundamentos" />
            {errors.title && <p className="mt-0.5 text-[10px] text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea {...register("description")} rows={2} className={cn(fieldCls, "resize-none")} placeholder="Descreva o conteúdo da aula..." />
            {errors.description && <p className="mt-0.5 text-[10px] text-red-400">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Thumbnail (URL)</label>
              <input {...register("thumbnail")} className={fieldCls} placeholder="https://..." />
              {errors.thumbnail && <p className="mt-0.5 text-[10px] text-red-400">{errors.thumbnail.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Duração</label>
              <input {...register("duration")} className={fieldCls} placeholder="12:30" />
              {errors.duration && <p className="mt-0.5 text-[10px] text-red-400">{errors.duration.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>URL do Vídeo (YouTube ou MP4)</label>
            <input {...register("videoUrl")} className={fieldCls} placeholder="https://youtube.com/watch?v=... ou https://..." />
            {errors.videoUrl && <p className="mt-0.5 text-[10px] text-red-400">{errors.videoUrl.message}</p>}
            <p className="mt-0.5 text-[10px] text-muted-foreground">Cole um link do YouTube ou URL direta de vídeo</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Modalidade</label>
              <select {...register("category")} className={fieldCls}>
                <option value="jiu-jitsu">Jiu Jitsu</option>
                <option value="luta-livre">Luta Livre</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Subcategoria</label>
              <select {...register("subcategory")} className={fieldCls}>
                {videoCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Nível</label>
              <select {...register("level")} className={fieldCls}>
                <option>Iniciante</option>
                <option>Intermediário</option>
                <option>Avançado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Instrutor</label>
              <select {...register("instructorId")} className={fieldCls}>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-foreground">Visível para alunos</span>
              <input type="checkbox" {...register("visible")} className="accent-primary h-4 w-4" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
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

          <DialogFooter className="pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Salvando..." : isEdit ? "Salvar" : "Adicionar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
