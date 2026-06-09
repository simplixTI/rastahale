import { useState } from "react";
import { ArrowLeft, Bell, Moon, Shield, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition-colors focus:outline-none", checked ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
    </label>
  );
}

const StudioConfiguracoes = () => {
  const navigate = useNavigate();
  const [notif,  setNotif]  = useState(true);
  const [upload, setUpload] = useState(false);
  const [dark,   setDark]   = useState(true);

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/studio/perfil")}
          className="rounded-full bg-card border border-border p-2 text-foreground">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>
      </div>

      <div className="mt-4 px-4 space-y-4">
        {/* notificações */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notificações</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4">
            <Toggle label="Novo comentário" description="Avise quando um aluno avaliar seu perfil"
              checked={notif} onChange={setNotif} />
            <Toggle label="Novo aluno" description="Avise quando alguém assistir sua primeira aula"
              checked={upload} onChange={setUpload} />
          </div>
        </div>

        {/* aparência */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Moon size={14} className="text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aparência</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4">
            <Toggle label="Tema escuro" description="Interface dark (padrão do app)"
              checked={dark} onChange={setDark} />
          </div>
        </div>

        {/* privacidade */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacidade</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4">
            <div className="py-3">
              <p className="text-sm font-medium text-foreground">Alterar senha</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Para alterar sua senha, contate o administrador da plataforma.</p>
            </div>
          </div>
        </div>

        {/* sobre */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sobre</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4">
            <div className="py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">RastaHale Academy</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Versão 1.0.0 · Studio do Instrutor</p>
            </div>
            <div className="py-3">
              <p className="text-sm font-medium text-foreground">Suporte</p>
              <p className="mt-0.5 text-xs text-muted-foreground">suporte@rastahale.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioConfiguracoes;
