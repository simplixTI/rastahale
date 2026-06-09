import { useState } from "react";
import { ArrowLeft, Bell, Moon, Globe, Shield, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

interface ToggleItemProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleItem({ label, description, checked, onChange }: ToggleItemProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors focus:outline-none",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}

const SETTINGS_KEY = "rasta_settings";

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"); }
  catch { return {}; }
}

const Settings = () => {
  const navigate = useNavigate();
  const saved = loadSettings();

  const [notifAulas,    setNotifAulas]    = useState(saved.notifAulas    ?? true);
  const [notifProgress, setNotifProgress] = useState(saved.notifProgress ?? true);
  const [notifPromo,    setNotifPromo]    = useState(saved.notifPromo    ?? false);
  const [autoplay,      setAutoplay]      = useState(saved.autoplay      ?? true);
  const [qualidadeHD,   setQualidadeHD]   = useState(saved.qualidadeHD   ?? true);

  const save = (key: string, value: boolean) => {
    const current = loadSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, [key]: value }));
  };

  const toggle = (setter: (v: boolean) => void, key: string) => (v: boolean) => {
    setter(v);
    save(key, v);
  };

  return (
    <MobileLayout>
      <header className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
      </header>

      <div className="mt-6 space-y-4 px-4 pb-10">
        {/* Notificações */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bell size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Notificações</p>
          </div>
          <div className="divide-y divide-border/60 px-4">
            <ToggleItem
              label="Novas aulas"
              description="Avise quando novos vídeos forem publicados"
              checked={notifAulas}
              onChange={toggle(setNotifAulas, "notifAulas")}
            />
            <ToggleItem
              label="Progresso semanal"
              description="Resumo do seu progresso toda segunda-feira"
              checked={notifProgress}
              onChange={toggle(setNotifProgress, "notifProgress")}
            />
            <ToggleItem
              label="Promoções e ofertas"
              description="Descontos e novidades dos planos"
              checked={notifPromo}
              onChange={toggle(setNotifPromo, "notifPromo")}
            />
          </div>
        </div>

        {/* Reprodução */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Moon size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Reprodução</p>
          </div>
          <div className="divide-y divide-border/60 px-4">
            <ToggleItem
              label="Autoplay"
              description="Iniciar próximo vídeo automaticamente"
              checked={autoplay}
              onChange={toggle(setAutoplay, "autoplay")}
            />
            <ToggleItem
              label="Qualidade HD"
              description="Preferir resolução mais alta (consome mais dados)"
              checked={qualidadeHD}
              onChange={toggle(setQualidadeHD, "qualidadeHD")}
            />
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Info size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Sobre</p>
          </div>
          <div className="divide-y divide-border/60 px-4">
            {[
              { label: "Versão do app", value: "1.0.0" },
              { label: "Suporte",       value: "contato@rastahale.com" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <p className="text-sm text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <p className="text-sm text-foreground">Política de Privacidade</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-muted-foreground" />
                <p className="text-sm text-foreground">Termos de Uso</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Settings;
