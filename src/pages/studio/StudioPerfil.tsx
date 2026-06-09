import { useState, useRef, useEffect } from "react";
import { Upload, LinkIcon, X, Loader2, Check, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useUpdateInstructor } from "@/hooks/useAdminData";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

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

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";

// ── StudioPerfil ──────────────────────────────────────────────────────────────

const StudioPerfil = () => {
  const { user }                              = useAuth();
  const { data: instructor, isLoading }       = useInstructor(user?.id ?? "");
  const updateInstructor                      = useUpdateInstructor();

  const [name,          setName]          = useState("");
  const [bio,           setBio]           = useState("");
  const [avatar,        setAvatar]        = useState("");
  const [avatarMode,    setAvatarMode]    = useState<"url" | "file">("url");
  const [uploading,     setUploading]     = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [showPass,      setShowPass]      = useState(false);
  const [dragging,      setDragging]      = useState(false);
  const [isDirty,       setDirty]         = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Preenche os campos quando carrega os dados do instrutor
  useEffect(() => {
    if (instructor) {
      setName(instructor.name);
      setBio(instructor.bio);
      setAvatar(instructor.avatar);
      setDirty(false);
    }
  }, [instructor]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024)     { toast.error("Imagem muito grande (máx. 5 MB)"); return; }
    setUploading(true); setProgress(0);
    try {
      const url = isMockMode() ? URL.createObjectURL(file) : (await uploadAvatar(file, setProgress) ?? "");
      if (isMockMode()) setProgress(100);
      if (!url) { toast.error("Erro ao enviar foto"); return; }
      setAvatar(url);
      setDirty(true);
    } finally { setUploading(false); }
  }

  function handleSave() {
    if (!name.trim()) { toast.error("O nome não pode ser vazio"); return; }
    if (!bio.trim())  { toast.error("A bio não pode ser vazia"); return; }
    if (!avatar)      { toast.error("Adicione uma foto de perfil"); return; }

    updateInstructor.mutate(
      {
        id:     user!.id,
        name:   name.trim(),
        bio:    bio.trim(),
        avatar,
        loginEmail:    instructor?.loginEmail,
        loginPassword: instructor?.loginPassword,
      },
      {
        onSuccess: () => { toast.success("Perfil atualizado!"); setDirty(false); },
        onError:   () => toast.error("Erro ao atualizar perfil"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
            <div>
              <p className="text-xs font-bold text-foreground leading-none">Meu Perfil</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
            </div>
          </div>
          {isDirty && (
            <button onClick={handleSave} disabled={updateInstructor.isPending}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
              <Check size={12} /> {updateInstructor.isPending ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* foto de perfil */}
        <div>
          <label className={labelCls}>Foto de perfil</label>

          {/* preview circular grande */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <img
                src={avatar || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=120&h=120&fit=crop"}
                alt={name}
                className="h-28 w-28 rounded-full border-4 border-primary object-cover shadow-xl"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=120&h=120&fit=crop"; }}
              />
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <span className="mt-1 text-[10px] text-white">{progress}%</span>
                </div>
              )}
            </div>
          </div>

          {/* tabs URL / arquivo */}
          <div className="mb-2 flex overflow-hidden rounded-lg border border-border w-fit mx-auto">
            {(["url", "file"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setAvatarMode(m)}
                className={cn("flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold transition-colors",
                  avatarMode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                {m === "url" ? <><LinkIcon size={10} /> URL</> : <><Upload size={10} /> Arquivo</>}
              </button>
            ))}
          </div>

          {avatarMode === "url" ? (
            <input
              value={avatar}
              onChange={(e) => { setAvatar(e.target.value); setDirty(true); }}
              className={fieldCls}
              placeholder="https://…"
            />
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 transition-colors",
                  uploading && "cursor-default",
                  dragging ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:border-primary/50"
                )}>
                {uploading ? <Loader2 size={20} className="animate-spin text-primary" />
                           : <Upload size={20} className={cn(dragging ? "text-primary" : "text-muted-foreground")} />}
                <p className="text-[11px] font-medium text-foreground">
                  {uploading ? `Enviando… ${progress}%` : "Clique ou arraste uma foto"}
                </p>
                <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP • máx. 5 MB</p>
                {uploading && progress > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            </>
          )}

          {avatar && (
            <button type="button" onClick={() => { setAvatar(""); setDirty(true); }}
              className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors">
              <X size={10} /> Remover foto
            </button>
          )}
        </div>

        {/* nome */}
        <div>
          <label className={labelCls}>Nome completo</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            className={fieldCls}
            placeholder="Seu nome"
          />
        </div>

        {/* bio */}
        <div>
          <label className={labelCls}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value); setDirty(true); }}
            rows={4}
            className={cn(fieldCls, "resize-none")}
            placeholder="Faixa preta, anos de experiência, especialidades…"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{bio.length} caracteres</p>
        </div>

        {/* acesso (read-only) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <Lock size={12} className="text-primary" /> Dados de acesso
          </p>
          <div>
            <label className={labelCls}>Email de login</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5">
              <Mail size={14} className="text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {instructor?.loginEmail ?? user?.email ?? "—"}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Para alterar email ou senha, peça ao administrador.
            </p>
          </div>
        </div>

        {/* botão salvar grande */}
        <button
          onClick={handleSave}
          disabled={!isDirty || updateInstructor.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          {updateInstructor.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
};

export default StudioPerfil;
