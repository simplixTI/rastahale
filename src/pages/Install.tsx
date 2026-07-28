import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, CheckCircle, Smartphone, Share,
  MoreVertical, Plus, Chrome, Apple,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// ── Step ──────────────────────────────────────────────────────────────────────

function Step({ number, icon, title, description }: {
  number: number; icon: ReactNode; title: string; description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {number}
        </div>
        <div className="mt-1 w-0.5 flex-1 bg-border" />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-primary">{icon}</div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StepLast({ number, icon, title, description }: {
  number: number; icon: ReactNode; title: string; description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-primary">{icon}</div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ── Install Page ──────────────────────────────────────────────────────────────

const Install = () => {
  const navigate               = useNavigate();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();

  // Detecta plataforma para definir tab inicial
  const defaultTab = isIOS ? "ios" : "android";
  const [tab, setTab] = useState<"android" | "ios">(defaultTab);

  if (isInstalled) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">App já instalado!</h1>
        <p className="text-sm text-muted-foreground">
          O RastaHale Academy já está instalado no seu dispositivo. Você pode abri-lo pela tela inicial.
        </p>
        <button onClick={() => navigate("/")}
          className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          Ir para o app
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-10">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <button onClick={() => navigate(history.length > 1 ? -1 : "/perfil")}
          className="rounded-full border border-border bg-card p-2 text-foreground">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Instalar App</h1>
      </div>

      {/* hero */}
      <div className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
        <img src={logo} alt="RastaHale" className="h-16 w-16 rounded-2xl shadow-lg flex-shrink-0" />
        <div>
          <p className="text-base font-bold text-foreground">RastaHale Academy</p>
          <p className="text-xs text-muted-foreground mt-0.5">Jiu-Jitsu e Luta Livre</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">Gratuito · Sem loja de apps</span>
          </div>
        </div>
      </div>

      {/* benefícios */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        {[
          { emoji: "⚡", label: "Acesso rápido" },
          { emoji: "📵", label: "Funciona offline" },
          { emoji: "🔔", label: "Notificações" },
        ].map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <span className="text-2xl">{b.emoji}</span>
            <p className="text-[10px] font-semibold text-muted-foreground">{b.label}</p>
          </div>
        ))}
      </div>

      {/* botão de instalação direta (Android Chrome) */}
      {canInstall && (
        <div className="mx-4 mt-5">
          <button
            onClick={install}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Download size={20} /> Instalar agora
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Toque para instalar direto no seu dispositivo
          </p>
        </div>
      )}

      {/* tabs: Android / iPhone */}
      <div className="mx-4 mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Instruções de instalação
        </p>
        <div className="flex overflow-hidden rounded-xl border border-border">
          <button onClick={() => setTab("android")}
            className={cn("flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
              tab === "android" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <Chrome size={16} /> Android
          </button>
          <button onClick={() => setTab("ios")}
            className={cn("flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
              tab === "ios" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <Apple size={16} /> iPhone / iPad
          </button>
        </div>
      </div>

      {/* instruções Android */}
      {tab === "android" && (
        <div className="mx-4 mt-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Chrome size={16} className="text-primary" />
              <p className="text-xs font-bold text-foreground">Chrome · Samsung Internet · Edge</p>
            </div>
            <div className="space-y-0">
              <Step number={1}
                icon={<Smartphone size={14} />}
                title="Abra no navegador"
                description="Acesse rastahale.simplix.digital pelo Chrome ou navegador padrão do seu Android." />
              <Step number={2}
                icon={<MoreVertical size={14} />}
                title='Toque nos "3 pontos"'
                description='Toque no ícone de menu (⋮) no canto superior direito do navegador.' />
              <Step number={3}
                icon={<Plus size={14} />}
                title='"Adicionar à tela inicial"'
                description='Selecione a opção "Adicionar à tela inicial" ou "Instalar app" no menu.' />
              <StepLast number={4}
                icon={<CheckCircle size={14} />}
                title="Confirme a instalação"
                description='Toque em "Adicionar" na janela de confirmação. O ícone do app aparecerá na sua tela inicial.' />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[11px] text-amber-400 font-semibold">💡 Dica</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No Chrome, pode aparecer um banner automático de instalação na parte inferior da tela. Toque nele para instalar ainda mais rápido!
            </p>
          </div>
        </div>
      )}

      {/* instruções iOS */}
      {tab === "ios" && (
        <div className="mx-4 mt-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Apple size={16} className="text-primary" />
              <p className="text-xs font-bold text-foreground">Safari (obrigatório no iPhone)</p>
            </div>
            <div className="space-y-0">
              <Step number={1}
                icon={<Smartphone size={14} />}
                title="Abra no Safari"
                description="Acesse rastahale.simplix.digital. A instalação só funciona pelo Safari — não pelo Chrome ou outros navegadores no iPhone." />
              <Step number={2}
                icon={<Share size={14} />}
                title='Toque em "Compartilhar"'
                description='Toque no ícone de compartilhar (□ com seta para cima) na barra inferior do Safari.' />
              <Step number={3}
                icon={<Plus size={14} />}
                title='"Adicionar à Tela de Início"'
                description='Role a lista de opções e toque em "Adicionar à Tela de Início" (ícone com um +).' />
              <StepLast number={4}
                icon={<CheckCircle size={14} />}
                title="Confirme o nome e instale"
                description='Toque em "Adicionar" no canto superior direito. O app aparecerá na sua tela inicial como um ícone nativo.' />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-[11px] text-blue-400 font-semibold">ℹ️ Por que só pelo Safari?</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              A Apple restringe a instalação de PWAs ao Safari. Abra o link no Safari e siga os passos acima.
            </p>
          </div>
        </div>
      )}

      {/* rodapé */}
      <div className="mx-4 mt-6 flex flex-col items-center gap-2 text-center">
        <img src={logo} alt="RastaHale" className="h-8 rounded-lg opacity-40" />
        <p className="text-[10px] text-muted-foreground">
          RastaHale Academy · Jiu-Jitsu e Luta Livre
        </p>
      </div>
    </div>
  );
};

export default Install;
