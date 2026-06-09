import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Plus, BookOpen, Eye, EyeOff, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminVideos, useCreateVideo, useToggleVideoVisibility } from "@/hooks/useAdminData";
import VideoFormModal from "@/components/VideoFormModal";
import { getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const StudioDashboard = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const { data: allVideos = [], isLoading } = useAdminVideos();
  const createVideo                         = useCreateVideo();
  const toggleVisibility                    = useToggleVideoVisibility();

  const [showUpload, setShowUpload] = useState(false);

  // Filtra só os vídeos deste instrutor
  const myVideos = allVideos.filter((v) => v.instructorId === user?.id);

  const totalVisible = myVideos.filter((v) => v.visible).length;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-10">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
            <div>
              <p className="text-xs font-bold text-foreground leading-none">Studio</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <div className="px-4 pt-5">
        {/* boas-vindas */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Bem-vindo ao seu studio,</p>
          <p className="text-base font-bold text-foreground">{user?.name} 👋</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Gerencie suas aulas e publique novo conteúdo.</p>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <BookOpen size={16} className="mx-auto text-primary" />
            <p className="mt-1 text-xl font-bold text-foreground">{myVideos.length}</p>
            <p className="text-[10px] text-muted-foreground">Aulas totais</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <Eye size={16} className="mx-auto text-emerald-400" />
            <p className="mt-1 text-xl font-bold text-foreground">{totalVisible}</p>
            <p className="text-[10px] text-muted-foreground">Publicadas</p>
          </div>
        </div>

        {/* upload */}
        <button
          onClick={() => setShowUpload(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload size={16} /> Enviar nova aula
        </button>

        {/* lista de vídeos */}
        <h2 className="mb-3 mt-6 text-sm font-bold text-foreground">Suas aulas</h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : myVideos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Plus size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma aula ainda.</p>
            <p className="text-xs text-muted-foreground">Clique em "Enviar nova aula" para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myVideos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                  {!v.visible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <EyeOff size={12} className="text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{v.duration}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
                  <p className="text-[10px] text-muted-foreground">{getCategoryLabel(v.category)} · {v.subcategory}</p>
                  <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold", getLevelColor(v.level))}>
                    {v.level}
                  </span>
                </div>
                <button
                  onClick={() =>
                    toggleVisibility.mutate(
                      { videoId: v.id, visible: !v.visible },
                      { onSuccess: () => toast.success(v.visible ? "Aula ocultada" : "Aula publicada") }
                    )
                  }
                  className={cn(
                    "flex-shrink-0 rounded-full p-1.5 transition-colors",
                    v.visible ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {v.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* modal upload */}
      <VideoFormModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onSubmit={(values) => {
          if (!user) return;
          createVideo.mutate(
            { ...values, instructorId: user.id, videoUrl: values.videoUrl || null } as Parameters<typeof createVideo.mutate>[0],
            {
              onSuccess: () => { toast.success("Aula enviada com sucesso!"); setShowUpload(false); },
              onError:   () => toast.error("Erro ao enviar aula"),
            }
          );
        }}
        isPending={createVideo.isPending}
      />
    </div>
  );
};

export default StudioDashboard;
