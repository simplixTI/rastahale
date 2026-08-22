import { resolveAvatarUrl, handleAvatarError } from "@/lib/avatar";
import { ChevronRight, User, Settings, LogOut, Video as VideoIcon, LayoutList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useAdminVideos } from "@/hooks/useAdminData";
import { useStudioSessions } from "@/hooks/useStudioSessions";
import logo from "@/assets/logo.png";

const StudioPerfil = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const { data: instructor }     = useInstructor(user?.id ?? "");
  const { data: allVideos = [] } = useAdminVideos();
  const { sessions }             = useStudioSessions(user?.id ?? "");

  const myVideos = allVideos.filter((v) => v.instructorId === user?.id);
  const avatarSrc = resolveAvatarUrl(instructor?.avatar);

  const menuItems = [
    { icon: User,     label: "Editar Perfil",   sub: "Nome, foto e bio",    onClick: () => navigate("/studio/perfil/editar")        },
    { icon: Settings, label: "Configurações",    sub: "Preferências do app", onClick: () => navigate("/studio/perfil/configuracoes") },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-foreground">Perfil</h1>
      </header>

      {/* avatar + info */}
      <div className="mt-6 flex flex-col items-center">
        <img
          src={avatarSrc}
          onError={handleAvatarError}
          alt={instructor?.name ?? user?.name}
          className="h-20 w-20 rounded-full border-2 border-primary object-cover"
        />
        <h2 className="mt-3 text-lg font-bold text-foreground">{instructor?.name ?? user?.name}</h2>
        <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
          Instrutor
        </span>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {myVideos.length} aula{myVideos.length !== 1 ? "s" : ""} · {sessions.length} sessão{sessions.length !== 1 ? "ões" : ""}
        </p>
        {instructor?.bio && (
          <p className="mt-2 max-w-[280px] text-center text-xs text-muted-foreground leading-relaxed">
            {instructor.bio}
          </p>
        )}
      </div>

      {/* menu */}
      <div className="mt-8 px-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map(({ icon: Icon, label, sub, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary flex-shrink-0">
                <Icon size={17} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <VideoIcon size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{myVideos.length}</p>
              <p className="text-[10px] text-muted-foreground">Aulas publicadas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 flex-shrink-0">
              <LayoutList size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{sessions.length}</p>
              <p className="text-[10px] text-muted-foreground">Sessões criadas</p>
            </div>
          </div>
        </div>

        {/* logout */}
        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={16} />
          Sair da conta
        </button>

        <div className="mt-8 flex justify-center">
          <img src={logo} alt="RastaHale" className="h-8 rounded opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default StudioPerfil;
