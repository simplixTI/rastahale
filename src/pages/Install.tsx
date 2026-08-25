import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t }                  = useTranslation();
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
        <h1 className="text-xl font-bold text-foreground">{t("install.installedTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("install.installedDesc")}
        </p>
        <button onClick={() => navigate("/")}
          className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          {t("install.goToApp")}
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
        <h1 className="text-lg font-bold text-foreground">{t("install.title")}</h1>
      </div>

      {/* hero */}
      <div className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
        <img src={logo} alt="RastaHale" className="h-16 w-16 rounded-2xl shadow-lg flex-shrink-0 object-contain" />
        <div>
          <p className="text-base font-bold text-foreground">RastaHale Academy</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("install.appSubtitle")}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">{t("install.free")}</span>
          </div>
        </div>
      </div>

      {/* benefícios */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        {[
          { emoji: "⚡", label: t("install.benefitFast") },
          { emoji: "📵", label: t("install.benefitOffline") },
          { emoji: "🔔", label: t("install.benefitNotifications") },
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
            <Download size={20} /> {t("install.installNow")}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("install.tapToInstall")}
          </p>
        </div>
      )}

      {/* tabs: Android / iPhone */}
      <div className="mx-4 mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("install.instructions")}
        </p>
        <div className="flex overflow-hidden rounded-xl border border-border">
          <button onClick={() => setTab("android")}
            className={cn("flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
              tab === "android" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <Chrome size={16} /> {t("install.tabAndroid")}
          </button>
          <button onClick={() => setTab("ios")}
            className={cn("flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
              tab === "ios" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <Apple size={16} /> {t("install.tabIos")}
          </button>
        </div>
      </div>

      {/* instruções Android */}
      {tab === "android" && (
        <div className="mx-4 mt-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Chrome size={16} className="text-primary" />
              <p className="text-xs font-bold text-foreground">{t("install.androidBrowsers")}</p>
            </div>
            <div className="space-y-0">
              <Step number={1}
                icon={<Smartphone size={14} />}
                title={t("install.android1Title")}
                description={t("install.android1Desc")} />
              <Step number={2}
                icon={<MoreVertical size={14} />}
                title={t("install.android2Title")}
                description={t("install.android2Desc")} />
              <Step number={3}
                icon={<Plus size={14} />}
                title={t("install.android3Title")}
                description={t("install.android3Desc")} />
              <StepLast number={4}
                icon={<CheckCircle size={14} />}
                title={t("install.android4Title")}
                description={t("install.android4Desc")} />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[11px] text-amber-400 font-semibold">{t("install.tipTitle")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("install.tipDesc")}
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
              <p className="text-xs font-bold text-foreground">{t("install.iosBrowser")}</p>
            </div>
            <div className="space-y-0">
              <Step number={1}
                icon={<Smartphone size={14} />}
                title={t("install.ios1Title")}
                description={t("install.ios1Desc")} />
              <Step number={2}
                icon={<Share size={14} />}
                title={t("install.ios2Title")}
                description={t("install.ios2Desc")} />
              <Step number={3}
                icon={<Plus size={14} />}
                title={t("install.ios3Title")}
                description={t("install.ios3Desc")} />
              <StepLast number={4}
                icon={<CheckCircle size={14} />}
                title={t("install.ios4Title")}
                description={t("install.ios4Desc")} />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-[11px] text-blue-400 font-semibold">{t("install.whySafariTitle")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("install.whySafariDesc")}
            </p>
          </div>
        </div>
      )}

      {/* rodapé */}
      <div className="mx-4 mt-6 flex flex-col items-center gap-2 text-center">
        <img src={logo} alt="RastaHale" className="h-8 rounded-lg opacity-40" />
        <p className="text-[10px] text-muted-foreground">
          {t("install.footer")}
        </p>
      </div>
    </div>
  );
};

export default Install;
