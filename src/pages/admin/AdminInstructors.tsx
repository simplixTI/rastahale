import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Edit2, Trash2, Upload, LinkIcon, Check, X,
  Loader2, ImageIcon, BookOpen, Users2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/components/AdminLayout";
import {
  useAdminInstructors, useCreateInstructor,
  useUpdateInstructor, useUpdateInstructorAvatar, useDeleteInstructor,
} from "@/hooks/useAdminData";
import { useAdminVideos } from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── helpers ───────────────────────────────────────────────────────────────────

function isMockMode(): boolean {
  try {
    const saved = sessionStorage.getItem("rasta_auth_user");
    if (!saved) return true;
    const { id } = JSON.parse(saved) as { id: string };
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  } catch { return true; }
}

async function uploadAvatar(file: File, onProgress?: (p: number) => void): Promise<string | null> {
  const path = `avatars/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    upsert: false,
    onUploadProgress: onProgress
      ? ({ loaded, total }: { loaded: number; total: number }) => {
          if (total) onProgress(Math.round((loaded / total) * 100));
        }
      : undefined,
  };
  const { error } = await supabase.storage.from("media").upload(path, file, opts);
  if (error) return null;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

// ── estilos ───────────────────────────────────────────────────────────────────

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

// ── schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:   z.string().min(3, "Mínimo 3 caracteres"),
  bio:    z.string().min(10, "Mínimo 10 caracteres"),
  avatar: z.string().min(1, "Adicione uma foto"),
});
type FormValues = z.infer<typeof schema>;

// ── AvatarUploader ────────────────────────────────────────────────────────────

interface AvatarUploaderProps {
  value:      string;
  uploading:  boolean;
  progress:   number;
  onChange:   (url: string) => void;
  onFile:     (file: File) => void;
}

function AvatarUploader({ value, uploading, progress, onChange, onFile }: AvatarUploaderProps) {
  const [mode, setMode]     = useState<"url" | "file">("url");
  const [dragging, setDrag] = useState(false);
  const fileRef             = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {/* tabs */}
      <div className="flex overflow-hidden rounded-lg border border-border w-fit">
        {(["url", "file"] as const).map((m) => (
          <button
            key={m} type="button" onClick={() => setMode(m)}
            className={cn(
              "flex items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "url" ? <><LinkIcon size={10} /> URL</> : <><Upload size={10} /> Arquivo</>}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldCls}
          placeholder="https://..."
        />
      ) : (
        <>
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault(); setDrag(false);
              const f = e.dataTransfer.files[0]; if (f) onFile(f);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors",
              uploading && "cursor-default",
              dragging ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:border-primary/50"
            )}
          >
            {uploading
              ? <Loader2 size={18} className="animate-spin text-primary" />
              : <Upload size={18} className={cn(dragging ? "text-primary" : "text-muted-foreground")} />
            }
            <p className="text-[11px] font-medium text-foreground">
              {uploading ? `Enviando… ${progress}%` : "Clique ou arraste uma foto"}
            </p>
            {!uploading && (
              <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP • máx. 5 MB</p>
            )}
            {uploading && progress > 0 && (
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </>
      )}

      {/* preview */}
      {value && (
        <div className="relative w-20 h-20">
          <img
            src={value} alt="preview"
            className="h-20 w-20 rounded-full object-cover border-2 border-border"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5"
          >
            <X size={10} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── InstructorFormModal ───────────────────────────────────────────────────────

type InstructorRow = { id: string; name: string; bio: string; avatar: string };

interface ModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  instructor?:  InstructorRow | null;
  onSubmit:     (v: FormValues) => void;
  isPending?:   boolean;
}

function InstructorFormModal({ open, onOpenChange, instructor, onSubmit, isPending }: ModalProps) {
  const isEdit = !!instructor;
  const [avatarUploading, setUploading] = useState(false);
  const [avatarProgress, setProgress]   = useState(0);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", bio: "", avatar: "" },
  });

  // reset quando modal abre/fecha
  useState(() => {
    if (open) {
      reset(instructor
        ? { name: instructor.name, bio: instructor.bio, avatar: instructor.avatar }
        : { name: "", bio: "", avatar: "" }
      );
      setProgress(0);
    }
  });

  const avatarValue = watch("avatar");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024)     { toast.error("Imagem muito grande (máx. 5 MB)"); return; }
    setUploading(true); setProgress(0);
    try {
      let url: string;
      if (isMockMode()) {
        url = URL.createObjectURL(file);
        setProgress(100);
      } else {
        url = (await uploadAvatar(file, setProgress)) ?? "";
        if (!url) { toast.error("Erro ao enviar foto"); return; }
      }
      setValue("avatar", url, { shouldValidate: true });
    } finally { setUploading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEdit ? "Editar Instrutor" : "Novo Instrutor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div>
            <label className={labelCls}>Nome</label>
            <input {...register("name")} className={fieldCls} placeholder="Ex: Rafael Leão" />
            {errors.name && <p className="mt-0.5 text-[10px] text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Bio</label>
            <textarea
              {...register("bio")} rows={3}
              className={cn(fieldCls, "resize-none")}
              placeholder="Faixa preta 3º grau, 15 anos de experiência…"
            />
            {errors.bio && <p className="mt-0.5 text-[10px] text-red-400">{errors.bio.message}</p>}
          </div>

          <div>
            <label className={cn(labelCls, "flex items-center gap-1")}>
              <ImageIcon size={10} /> Foto do instrutor
            </label>
            <AvatarUploader
              value={avatarValue}
              uploading={avatarUploading}
              progress={avatarProgress}
              onChange={(url) => setValue("avatar", url, { shouldValidate: true })}
              onFile={handleFile}
            />
            {errors.avatar && <p className="mt-0.5 text-[10px] text-red-400">{errors.avatar.message}</p>}
          </div>

          <DialogFooter className="pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || avatarUploading}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {avatarUploading ? "Enviando…" : isPending ? "Salvando…" : isEdit ? "Salvar" : "Adicionar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── InstructorCard ────────────────────────────────────────────────────────────

interface CardProps {
  instructor:  InstructorRow;
  videoCount:  number;
  onEdit:      () => void;
  onDelete:    () => void;
}

function InstructorCard({ instructor, videoCount, onEdit, onDelete }: CardProps) {
  const updateAvatar                    = useUpdateInstructorAvatar();
  const [avatarEditOpen, setAvatarEdit] = useState(false);
  const [avatarUrl,      setAvatarUrl]  = useState("");
  const [uploading,      setUploading]  = useState(false);
  const [progress,       setProgress]   = useState(0);
  const fileRef                         = useRef<HTMLInputElement>(null);

  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024)     { toast.error("Imagem muito grande (máx. 5 MB)"); return; }
    setUploading(true); setProgress(0);
    try {
      let url: string;
      if (isMockMode()) { url = URL.createObjectURL(file); setProgress(100); }
      else {
        url = (await uploadAvatar(file, setProgress)) ?? "";
        if (!url) { toast.error("Erro ao enviar foto"); return; }
      }
      updateAvatar.mutate(
        { id: instructor.id, avatar: url },
        {
          onSuccess: () => { toast.success("Foto atualizada"); setAvatarEdit(false); },
          onError:   () => toast.error("Erro ao atualizar foto"),
        }
      );
    } finally { setUploading(false); }
  }

  function confirmAvatarUrl() {
    if (!avatarUrl.trim()) { toast.error("Informe a URL da foto"); return; }
    updateAvatar.mutate(
      { id: instructor.id, avatar: avatarUrl.trim() },
      {
        onSuccess: () => { toast.success("Foto atualizada"); setAvatarEdit(false); setAvatarUrl(""); },
        onError:   () => toast.error("Erro ao atualizar foto"),
      }
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* info principal */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative flex-shrink-0">
          <img
            src={instructor.avatar || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=80&h=80&fit=crop"}
            alt={instructor.name}
            className="h-16 w-16 rounded-full object-cover border-2 border-border"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{instructor.name}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{instructor.bio}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BookOpen size={10} /> {videoCount} vídeo{videoCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* edição inline de avatar */}
      {avatarEditOpen && (
        <div className="border-t border-border px-3 py-2.5 space-y-2 bg-secondary/30">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ""; }}
          />
          <div className="flex items-center gap-1.5">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... (URL da foto)"
              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={confirmAvatarUrl} disabled={updateAvatar.isPending} className="text-emerald-400 disabled:opacity-50">
              <Check size={14} />
            </button>
            <button onClick={() => { setAvatarEdit(false); setAvatarUrl(""); }} className="text-muted-foreground">
              <X size={14} />
            </button>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {uploading
              ? <><span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" /> Enviando… {progress}%</>
              : <><Upload size={11} /> Enviar arquivo</>
            }
          </button>
          {uploading && progress > 0 && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* ações */}
      <div className="flex border-t border-border">
        <button
          onClick={() => { setAvatarEdit((v) => !v); setAvatarUrl(""); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium border-r border-border transition-colors",
            avatarEditOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary/50"
          )}
        >
          <ImageIcon size={12} /> Foto
        </button>
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors"
        >
          <Edit2 size={12} /> Editar
        </button>
        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={12} /> Remover
        </button>
      </div>
    </div>
  );
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="border-border bg-background sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">Remover instrutor?</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Tem certeza que deseja remover <span className="font-semibold text-foreground">{name}</span>?
          Os vídeos associados a ele permanecerão, mas ficarão sem instrutor.
        </p>
        <DialogFooter className="pt-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Cancelar
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white">
            Remover
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AdminInstructors ──────────────────────────────────────────────────────────

const AdminInstructors = () => {
  const { data: instructors = [], isLoading } = useAdminInstructors();
  const { data: videos = [] }                 = useAdminVideos();
  const createInstructor                      = useCreateInstructor();
  const updateInstructor                      = useUpdateInstructor();
  const deleteInstructor                      = useDeleteInstructor();

  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState<InstructorRow | null>(null);
  const [deleting,     setDeleting]     = useState<InstructorRow | null>(null);

  function videoCount(instructorId: string) {
    return videos.filter((v) => v.instructorId === instructorId).length;
  }

  function handleCreate(values: FormValues) {
    createInstructor.mutate(
      { name: values.name, bio: values.bio, avatar: values.avatar },
      {
        onSuccess: () => { toast.success("Instrutor adicionado"); setShowCreate(false); },
        onError:   () => toast.error("Erro ao adicionar instrutor"),
      }
    );
  }

  function handleUpdate(values: FormValues) {
    if (!editing) return;
    updateInstructor.mutate(
      { id: editing.id, name: values.name, bio: values.bio, avatar: values.avatar },
      {
        onSuccess: () => { toast.success("Instrutor atualizado"); setEditing(null); },
        onError:   () => toast.error("Erro ao atualizar instrutor"),
      }
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteInstructor.mutate(
      { id: deleting.id },
      {
        onSuccess: () => { toast.success("Instrutor removido"); setDeleting(null); },
        onError:   () => toast.error("Erro ao remover instrutor"),
      }
    );
  }

  return (
    <AdminLayout title="Instrutores">
      {/* modais */}
      <InstructorFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleCreate}
        isPending={createInstructor.isPending}
      />
      <InstructorFormModal
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        instructor={editing}
        onSubmit={handleUpdate}
        isPending={updateInstructor.isPending}
      />
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {/* cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Instrutores</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>

      {/* stats */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <Users2 size={16} className="mx-auto text-primary" />
          <p className="mt-1 text-xl font-bold text-foreground">{instructors.length}</p>
          <p className="text-[10px] text-muted-foreground">Instrutores</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <BookOpen size={16} className="mx-auto text-amber-400" />
          <p className="mt-1 text-xl font-bold text-foreground">{videos.length}</p>
          <p className="text-[10px] text-muted-foreground">Vídeos no total</p>
        </div>
      </div>

      {/* lista */}
      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {instructors.map((inst) => (
            <InstructorCard
              key={inst.id}
              instructor={inst}
              videoCount={videoCount(inst.id)}
              onEdit={() => setEditing(inst)}
              onDelete={() => setDeleting(inst)}
            />
          ))}
        </div>
      )}

      {!isLoading && instructors.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Users2 size={36} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum instrutor cadastrado</p>
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            Adicionar primeiro instrutor
          </button>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInstructors;
