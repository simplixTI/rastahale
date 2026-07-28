import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useUpdateInstructor } from "@/hooks/useAdminData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Modo demo = Supabase não configurado (ver nota em StudioDashboard).
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

function resizeToSquare(file: File, size = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const StudioEditPerfil = () => {
  const navigate               = useNavigate();
  const { user }               = useAuth();
  const { data: instructor }   = useInstructor(user?.id ?? "");
  const updateInstructor       = useUpdateInstructor();
  const fileRef                = useRef<HTMLInputElement>(null);

  const [name,    setName]    = useState("");
  const [bio,     setBio]     = useState("");
  const [avatar,  setAvatar]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (instructor) {
      setName(instructor.name);
      setBio(instructor.bio);
      setAvatar(instructor.avatar);
    }
  }, [instructor]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (isMockMode()) {
        // resize locally for mock
        const resized = await resizeToSquare(file);
        setAvatar(resized);
      } else {
        // upload to Supabase storage
        const path = `avatars/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const { error } = await supabase.storage.from("media").upload(path, file);
        if (!error) {
          setAvatar(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
        }
      }
    } catch { toast.error("Erro ao processar imagem"); }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Nome não pode ser vazio"); return; }
    if (!bio.trim())  { toast.error("Bio não pode ser vazia"); return; }
    setSaving(true);
    try {
      await updateInstructor.mutateAsync({
        id: user!.id,
        name: name.trim(),
        bio:  bio.trim(),
        avatar,
        loginEmail:    instructor?.loginEmail,
        loginPassword: instructor?.loginPassword,
      });
      setSaved(true);
      setTimeout(() => navigate("/studio/perfil"), 800);
    } catch {
      toast.error("Erro ao salvar");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/studio/perfil")}
          className="rounded-full bg-card border border-border p-2 text-foreground">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Editar Perfil</h1>
      </div>

      {/* avatar */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={avatar || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop"}
            alt="Foto de perfil"
            className="h-28 w-28 rounded-full border-2 border-primary object-cover"
          />
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 rounded-full bg-primary p-2 shadow-lg">
            <Camera size={16} className="text-primary-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Toque na câmera para alterar</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      {/* form */}
      <div className="mt-8 px-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Faixa preta, anos de experiência, especialidades…"
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{bio.length} caracteres</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
          <input
            value={instructor?.loginEmail ?? user?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Para alterar email ou senha, contate o administrador.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-2xl btn-press py-3 text-sm font-bold transition-all",
            saved
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          )}
        >
          {saved ? (
            <><Check size={16} /> Salvo!</>
          ) : saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Salvar alterações"
          )}
        </button>
      </div>
    </div>
  );
};

export default StudioEditPerfil;
