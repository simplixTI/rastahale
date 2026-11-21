import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown, ArrowUp, BookOpen, Check, ChevronDown, ExternalLink, EyeOff, FolderOpen,
  FolderPlus, ImagePlus, Layers, Pencil, Plus, ShieldCheck, Trash2, X,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { uploadMedia } from "@/lib/storageUpload";
import AdminLayout from "@/components/AdminLayout";
import AvatarImage from "@/components/AvatarImage";
import { useAdminInstructors, useAdminVideos, useCreateVideo, useDeleteVideo } from "@/hooks/useAdminData";
import VideoFormModal from "@/components/VideoFormModal";
import { useStudioSessions, type SessionExtras, type StudioSession } from "@/hooks/useStudioSessions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Página do professor no admin: perfil + gestão dos módulos dele.
//
// "Módulo" é a studio_session — a mesma lista que o professor monta no Studio e
// que o aluno vê em /atleta/:id. A ordem das aulas é a ordem do array video_ids,
// então reordenar não exige nada novo no banco. A policy studio_sessions_write
// já libera o admin (public.is_admin()).

type Lesson = { id: string; title: string; thumbnail: string; duration: string; visible: boolean };

const fieldCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring";
const labelCls = "mb-1 block text-xs font-semibold text-foreground";

// ── Linha de aula ───────────────────────────────────────────────────────────

function LessonRow({ lesson, index, children }: { lesson: Lesson; index?: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {index !== undefined && (
        <span className="tabular w-5 flex-shrink-0 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
      )}
      <img
        src={lesson.thumbnail}
        alt=""
        loading="lazy"
        className="h-10 w-[4.5rem] flex-shrink-0 rounded-md bg-secondary object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{lesson.title}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular">{lesson.duration}</span>
          {!lesson.visible && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <EyeOff size={11} aria-hidden="true" /> oculta para alunos
            </span>
          )}
        </p>
      </div>
      {children}
    </div>
  );
}

const iconBtn =
  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";

// ── Envio de imagem (capa do módulo, foto do professor) ─────────────────────

function ImagePicker({ value, onChange, folder, label, shape = "wide" }: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label: string;
  shape?: "wide" | "round";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Escolha um arquivo de imagem (JPG ou PNG)."); return; }
    setUploading(true);
    try {
      onChange(await uploadMedia(file, folder));
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível enviar a imagem. Tente de novo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary text-muted-foreground",
          shape === "round" ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-lg"
        )}
      >
        {value
          ? <img src={value} alt="" className="h-full w-full object-cover" />
          : <ImagePlus size={20} aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={label}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {uploading ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => onChange(null)} className="ml-3 text-sm text-muted-foreground underline underline-offset-4 hover:text-destructive">
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

// ── Editar perfil do professor ──────────────────────────────────────────────

function ProfileDialog({ instructor, onClose }: {
  instructor: { id: string; name: string; bio: string; avatar: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName]     = useState(instructor.name);
  const [bio, setBio]       = useState(instructor.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(instructor.avatar || null);
  const [touched, setTouched] = useState(false);
  const nameError = touched && name.trim().length < 2 ? "Informe o nome do professor." : "";

  // Só nome, descrição e foto. E-mail e senha do Studio continuam no cartão
  // da lista (Editar), porque passam pela função que cria o login.
  const save = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) throw new Error("Banco não configurado neste ambiente.");
      const { error } = await supabase
        .from("instructors")
        .update({ name: name.trim(), bio: bio.trim(), avatar_url: avatar ?? "" })
        .eq("id", instructor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      qc.invalidateQueries({ queryKey: ["instructors"] });
      qc.invalidateQueries({ queryKey: ["instructor", instructor.id] });
      toast.success("Perfil atualizado");
      onClose();
    },
    onError: (err) => toast.error((err as Error).message || "Não foi possível salvar o perfil. Tente de novo."),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Editar perfil</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); setTouched(true); if (name.trim().length >= 2) save.mutate(); }}
          className="space-y-4"
        >
          <div>
            <span className={labelCls}>Foto</span>
            <ImagePicker value={avatar} onChange={setAvatar} folder="avatars" label="Foto do professor" shape="round" />
          </div>
          <div>
            <label htmlFor="prof-name" className={labelCls}>Nome</label>
            <input
              id="prof-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)}
              aria-invalid={!!nameError} aria-describedby={nameError ? "prof-name-error" : undefined} className={fieldCls}
            />
            {nameError && <p id="prof-name-error" role="alert" className="mt-1 text-xs text-destructive">{nameError}</p>}
          </div>
          <div>
            <label htmlFor="prof-bio" className={labelCls}>Descrição</label>
            <textarea
              id="prof-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              placeholder="Graduação, equipe, títulos — o que o aluno lê no perfil"
              className={cn(fieldCls, "resize-none")}
            />
          </div>
          <DialogFooter className="gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={save.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {save.isPending ? "Salvando…" : "Salvar perfil"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Formulário de módulo (criar / editar) ───────────────────────────────────

function ModuleDialog({ open, module, lessons, onClose, onSave }: {
  open: boolean;
  module: StudioSession | null;
  lessons: Lesson[];
  onClose: () => void;
  onSave: (title: string, description: string, videoIds: string[], extras: SessionExtras) => void;
}) {
  const [cover, setCover]             = useState<string | null>(module?.coverUrl ?? null);
  const [title, setTitle]             = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [picked, setPicked]           = useState<string[]>(module?.videoIds ?? []);
  const [touched, setTouched]         = useState(false);

  const titleError = touched && title.trim().length < 2 ? "Dê um nome ao módulo (mínimo 2 letras)." : "";

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (title.trim().length < 2) return;
    // Mantém a ordem já definida e joga as aulas recém-marcadas para o fim.
    const kept = (module?.videoIds ?? []).filter((id) => picked.includes(id));
    const added = picked.filter((id) => !kept.includes(id));
    onSave(title.trim(), description.trim(), [...kept, ...added], { coverUrl: cover });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {module ? "Editar módulo" : "Novo módulo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="module-title" className={labelCls}>Nome do módulo</label>
            <input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ex.: Passagem de guarda — do básico ao avançado"
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "module-title-error" : undefined}
              className={fieldCls}
            />
            {titleError && (
              <p id="module-title-error" role="alert" className="mt-1 text-xs text-destructive">{titleError}</p>
            )}
          </div>

          <div>
            <label htmlFor="module-description" className={labelCls}>Descrição <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <textarea
              id="module-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="O que o aluno aprende neste módulo"
              className={cn(fieldCls, "resize-none")}
            />
          </div>

          <div>
            <span className={labelCls}>Capa <span className="font-normal text-muted-foreground">(opcional)</span></span>
            <ImagePicker value={cover} onChange={setCover} folder="modules" label="Capa do módulo" />
            <p className="mt-1.5 text-xs text-muted-foreground">Sem capa, o aluno vê a miniatura da primeira aula.</p>
          </div>

          <fieldset>
            <legend className={labelCls}>
              Aulas do módulo <span className="tabular font-normal text-muted-foreground">({picked.length} de {lessons.length})</span>
            </legend>
            {lessons.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Este professor ainda não tem aulas. Envie aulas em Vídeos e volte para montar o módulo.
              </p>
            ) : (
              <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {lessons.map((lesson) => {
                  const on = picked.includes(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/60">
                        <input type="checkbox" checked={on} onChange={() => toggle(lesson.id)} className="peer sr-only" />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                            on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                          )}
                        >
                          {on && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{lesson.title}</span>
                          <span className="tabular block text-xs text-muted-foreground">{lesson.duration}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          <DialogFooter className="gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              {module ? "Salvar módulo" : "Criar módulo"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Cartão de módulo ────────────────────────────────────────────────────────

function ModuleCard({ module, lessonsById, defaultOpen, others, canMoveUp, canMoveDown, onMoveModule, onMoveLesson, onAddLesson, onEdit, onDelete, onReorder, onRemoveLesson }: {
  module: StudioSession;
  lessonsById: Map<string, Lesson>;
  defaultOpen: boolean;
  /** Os outros módulos do professor, para "mover aula para…". */
  others: StudioSession[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveModule: (direction: -1 | 1) => void;
  onMoveLesson: (videoId: string, toModuleId: string) => void;
  /** Envia uma aula nova já dentro deste módulo. */
  onAddLesson: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReorder: (videoIds: string[]) => void;
  onRemoveLesson: (videoId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Aula apagada continua no array até alguém salvar; aqui só mostramos as que existem.
  const ids = module.videoIds.filter((id) => lessonsById.has(id));
  const panelId = `module-panel-${module.id}`;

  const move = (from: number, to: number) => {
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  };

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-1 p-2 pl-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 text-left"
        >
          {module.coverUrl ? (
            <img src={module.coverUrl} alt="" className="h-10 w-16 flex-shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              <FolderOpen size={18} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{module.title}</span>
            <span className="tabular block truncate text-xs text-muted-foreground">
              {ids.length === 1 ? "1 aula" : `${ids.length} aulas`}
              {module.description && ` · ${module.description}`}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn("flex-shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", open && "rotate-180")}
          />
        </button>
        <button type="button" onClick={() => onMoveModule(-1)} disabled={!canMoveUp} aria-label={`Subir o módulo ${module.title}`} className={iconBtn}>
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMoveModule(1)} disabled={!canMoveDown} aria-label={`Descer o módulo ${module.title}`} className={iconBtn}>
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onEdit} aria-label={`Editar o módulo ${module.title}`} className={iconBtn}>
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onDelete} aria-label={`Excluir o módulo ${module.title}`} className={cn(iconBtn, "hover:bg-destructive/10 hover:text-destructive")}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div id={panelId} className="border-t border-border">
          {ids.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">Módulo vazio. O aluno não o vê até ter pelo menos uma aula.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={onAddLesson} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Plus size={15} aria-hidden="true" /> Enviar nova aula
                </button>
                <button type="button" onClick={onEdit} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                  Escolher aulas existentes
                </button>
              </div>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {ids.map((id, index) => {
                const lesson = lessonsById.get(id)!;
                return (
                  <li key={id}>
                    <LessonRow lesson={lesson} index={index}>
                      {others.length > 0 && (
                        <select
                          aria-label={`Mover "${lesson.title}" para outro módulo`}
                          value=""
                          onChange={(e) => { if (e.target.value) onMoveLesson(id, e.target.value); }}
                          className="hidden max-w-[8.5rem] flex-shrink-0 rounded-lg border border-border bg-background px-2 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring sm:block"
                        >
                          <option value="">Mover para…</option>
                          {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Subir "${lesson.title}"`} className={iconBtn}>
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => move(index, index + 1)} disabled={index === ids.length - 1} aria-label={`Descer "${lesson.title}"`} className={iconBtn}>
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => onRemoveLesson(id)} aria-label={`Tirar "${lesson.title}" do módulo`} className={cn(iconBtn, "hover:bg-destructive/10 hover:text-destructive")}>
                        <X size={16} aria-hidden="true" />
                      </button>
                    </LessonRow>
                  </li>
                );
              })}
            </ol>
          )}
          {ids.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={onAddLesson}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Plus size={15} aria-hidden="true" /> Nova aula neste módulo
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

const AdminInstructorDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: instructors = [], isLoading } = useAdminInstructors();
  const { data: videos = [] } = useAdminVideos();
  const { sessions, create, update, remove, addVideo, reorder, moveVideo } = useStudioSessions(id);

  const [dialog, setDialog]     = useState<{ module: StudioSession | null } | null>(null);
  const [deleting, setDeleting] = useState<StudioSession | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  // Envio de aula nova: moduleId = módulo de destino; null = fica sem módulo.
  const [uploadTo, setUploadTo] = useState<{ moduleId: string | null } | null>(null);
  const createVideo = useCreateVideo();
  const deleteVideo = useDeleteVideo();
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);

  const instructor = instructors.find((i) => i.id === id);

  const lessons: Lesson[] = useMemo(
    () => videos
      .filter((v) => v.instructorId === id)
      .map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration, visible: v.visible !== false })),
    [videos, id]
  );
  const lessonsById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  const inSomeModule = useMemo(() => new Set(sessions.flatMap((s) => s.videoIds)), [sessions]);
  const loose = lessons.filter((l) => !inSomeModule.has(l.id));

  if (isLoading) {
    return (
      <AdminLayout title="Professor" backTo="/admin/instrutores" width="wide">
        <div className="space-y-3 pt-2" aria-busy="true" aria-label="Carregando professor">
          <div className="shimmer h-24 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
        </div>
      </AdminLayout>
    );
  }

  if (!instructor) {
    return (
      <AdminLayout title="Professor" backTo="/admin/instrutores">
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Professor não encontrado. Ele pode ter sido removido.</p>
          <button type="button" onClick={() => navigate("/admin/instrutores")} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4">
            Voltar para Instrutores
          </button>
        </div>
      </AdminLayout>
    );
  }

  const save = (title: string, description: string, videoIds: string[], extras: SessionExtras) => {
    if (dialog?.module) update(dialog.module.id, title, description, videoIds, extras);
    else create(title, description, videoIds, extras);
    setDialog(null);
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    const ids = sessions.map((s) => s.id);
    const [item] = ids.splice(index, 1);
    ids.splice(index + direction, 0, item);
    reorder(ids);
  };

  return (
    <AdminLayout title={instructor.name} backTo="/admin/instrutores" width="wide">
      {/* Mesmo formulário de envio de Vídeos, com o professor já fixado. A aula
          nova entra no fim do módulo de onde o admin clicou. */}
      <VideoFormModal
        open={!!uploadTo}
        onOpenChange={(v) => { if (!v) setUploadTo(null); }}
        hideInstructor
        isPending={createVideo.isPending}
        onSubmit={(values) => {
          const target = uploadTo?.moduleId ?? null;
          createVideo.mutate(
            { ...values, instructorId: instructor.id, videoUrl: values.videoUrl || null } as Parameters<typeof createVideo.mutate>[0],
            {
              onSuccess: ({ id: videoId }) => {
                if (target) addVideo(target, videoId);
                const name = sessions.find((s) => s.id === target)?.title;
                toast.success(name ? `Aula enviada e adicionada a "${name}"` : "Aula enviada");
                setUploadTo(null);
              },
              onError: (err) => toast.error((err as Error).message || "Não foi possível salvar a aula. Tente de novo."),
            }
          );
        }}
      />

      {editingProfile && (
        <ProfileDialog
          instructor={{ id: instructor.id, name: instructor.name, bio: instructor.bio ?? "", avatar: instructor.avatar ?? "" }}
          onClose={() => setEditingProfile(false)}
        />
      )}

      {dialog && (
        <ModuleDialog
          // key: reabrir para outro módulo recomeça o formulário do zero
          key={dialog.module?.id ?? "new"}
          open
          module={dialog.module}
          lessons={lessons}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o módulo "{deleting?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O módulo some da página do professor para os alunos. As aulas não são apagadas: continuam no catálogo e voltam para "Aulas sem módulo".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter módulo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleting) remove(deleting.id); setDeleting(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir módulo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingLesson} onOpenChange={(v) => { if (!v && !deleteVideo.isPending) setDeletingLesson(null); }}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a aula "{deletingLesson?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula sai do catálogo e o vídeo é apagado do servidor. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVideo.isPending}>Manter aula</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteVideo.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!deletingLesson) return;
                deleteVideo.mutate(deletingLesson.id, {
                  onSuccess: () => { toast.success("Aula excluída"); setDeletingLesson(null); },
                  onError: (err) => toast.error((err as Error).message || "Não foi possível excluir a aula. Tente de novo."),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVideo.isPending ? "Excluindo…" : "Excluir aula"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Perfil ─────────────────────────────────────────────────────── */}
      <section aria-label="Perfil do professor" className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <AvatarImage src={instructor.avatar} name={instructor.name} className="h-16 w-16 flex-shrink-0 rounded-full text-lg" />
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="truncate text-lg font-bold text-foreground">{instructor.name}</h2>
          {instructor.bio && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{instructor.bio}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {instructor.hasLogin ? (
              <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck size={13} aria-hidden="true" /> Tem acesso ao Studio
              </span>
            ) : (
              <span>Sem acesso ao Studio — só o admin gerencia os módulos</span>
            )}
            {instructor.loginEmail && <span className="truncate">{instructor.loginEmail}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil size={15} aria-hidden="true" /> Editar perfil
          </button>
          <button
            type="button"
            onClick={() => navigate(`/atleta/${instructor.id}`)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <ExternalLink size={15} aria-hidden="true" /> Ver como aluno
          </button>
        </div>
      </section>

      <dl className="stagger mt-3 grid grid-cols-3 gap-2 lg:max-w-xl">
        {[
          { icon: BookOpen, value: lessons.length, label: "Aulas" },
          { icon: Layers, value: sessions.length, label: "Módulos" },
          { icon: FolderPlus, value: loose.length, label: "Sem módulo" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <Icon size={16} className="text-muted-foreground" aria-hidden="true" />
            <dd className="tabular mt-1 text-xl font-bold text-foreground">{value}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ── Módulos ──────────────────────────────────────────────────── */}
        <section aria-labelledby="modules-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="modules-heading" className="text-base font-bold text-foreground">Módulos</h3>
              <p className="text-xs text-muted-foreground">Na ordem em que o aluno vê na página do professor.</p>
            </div>
            <button
              type="button"
              onClick={() => setDialog({ module: null })}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus size={15} aria-hidden="true" /> Novo módulo
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <Layers size={26} className="mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-foreground">Nenhum módulo ainda</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Agrupe as aulas em módulos para dar uma sequência de estudo ao aluno.
              </p>
              <button type="button" onClick={() => setDialog({ module: null })} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4">
                Criar o primeiro módulo
              </button>
            </div>
          ) : (
            <ul className="stagger mt-3 space-y-2">
              {sessions.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  lessonsById={lessonsById}
                  defaultOpen={index === 0}
                  others={sessions.filter((s) => s.id !== module.id)}
                  canMoveUp={index > 0}
                  canMoveDown={index < sessions.length - 1}
                  onMoveModule={(direction) => moveModule(index, direction)}
                  onMoveLesson={(videoId, toId) => moveVideo(module.id, toId, videoId)}
                  onAddLesson={() => setUploadTo({ moduleId: module.id })}
                  onEdit={() => setDialog({ module })}
                  onDelete={() => setDeleting(module)}
                  onReorder={(videoIds) => update(module.id, module.title, module.description, videoIds)}
                  onRemoveLesson={(videoId) =>
                    update(module.id, module.title, module.description, module.videoIds.filter((v) => v !== videoId))
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── Aulas sem módulo ─────────────────────────────────────────── */}
        <section aria-labelledby="loose-heading" className="mt-8 lg:mt-0">
          <h3 id="loose-heading" className="text-base font-bold text-foreground">Aulas sem módulo</h3>
          <p className="text-xs text-muted-foreground">
            {loose.length > 0
              ? "Estas aulas existem, mas não estão em nenhuma sequência."
              : lessons.length > 0
                ? "Todas as aulas deste professor já estão em algum módulo."
                : "Este professor ainda não tem aulas enviadas."}
          </p>

          {loose.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {loose.map((lesson) => (
                <li key={lesson.id}>
                  <LessonRow lesson={lesson}>
                    {sessions.length > 0 ? (
                      <select
                        aria-label={`Adicionar "${lesson.title}" a um módulo`}
                        value=""
                        onChange={(e) => { if (e.target.value) addVideo(e.target.value, lesson.id); }}
                        className="max-w-[9.5rem] flex-shrink-0 rounded-lg border border-border bg-background px-2 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Adicionar a…</option>
                        {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDeletingLesson(lesson)}
                      aria-label={`Excluir a aula ${lesson.title}`}
                      className={cn(iconBtn, "hover:bg-destructive/10 hover:text-destructive")}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </LessonRow>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setUploadTo({ moduleId: null })}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Plus size={15} aria-hidden="true" /> Enviar aula sem módulo
          </button>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminInstructorDetail;
