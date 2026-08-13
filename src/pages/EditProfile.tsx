import { useState, useRef } from "react";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useProfileOverride } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

function resizeImageToSquare(file: File, size = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      // Crop to center square before resizing
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

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const { data: profile } = useProfile(user?.id ?? "");
  const { override, updateOverride } = useProfileOverride();
  const updateProfile = useUpdateProfile();

  const currentName = override.name ?? profile?.name ?? user?.name ?? "";
  const currentAvatar =
    override.avatarUrl ??
    profile?.avatarUrl ??
    "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop";

  const [name, setName] = useState(currentName);
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageToSquare(file, 200);
      setAvatarPreview(resized);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({ userId: user.id, name: name.trim(), avatarUrl: avatarPreview });
      updateOverride({ name: name.trim(), avatarUrl: avatarPreview });
      setSaved(true);
      setTimeout(() => navigate("/perfil"), 800);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/perfil")}
          className="rounded-full bg-card border border-border p-2 text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("editProfile.title")}</h1>
      </div>

      {/* Avatar */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={avatarPreview}
            alt={t("editProfile.avatarAlt")}
            className="h-28 w-28 rounded-full border-2 border-primary object-cover"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 rounded-full bg-primary p-2 shadow-lg"
          >
            <Camera size={16} className="text-primary-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t("editProfile.tapCamera")}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Form */}
      <div className="mt-8 px-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("editProfile.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("editProfile.namePlaceholder")}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("editProfile.email")}</label>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{t("editProfile.emailLocked")}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-full btn-press py-3 text-sm font-bold transition-all",
            saved
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          )}
        >
          {saved ? (
            <>
              <Check size={16} />
              {t("editProfile.saved")}
            </>
          ) : isSaving ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
          ) : (
            t("editProfile.save")
          )}
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
