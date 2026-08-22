import { ChevronRight, User, CreditCard, Settings, LogOut, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAvatarUrl, handleAvatarError } from "@/lib/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useProfileOverride } from "@/contexts/ProfileContext";
import MobileLayout from "@/components/MobileLayout";
import { Pill } from "@/components/Pill";
import logo from "@/assets/logo.png";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: profile } = useProfile(user?.id ?? "");
  const { override } = useProfileOverride();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const avatarSrc = resolveAvatarUrl(override.avatarUrl, profile?.avatarUrl);
  const displayName = override.name ?? profile?.name ?? user?.name ?? t("home.fallbackName");
  const planName = profile?.planName ?? "—";

  const menuItems = [
    { icon: User,       label: t("profile.editProfile"), onClick: () => navigate("/perfil/editar")        },
    { icon: CreditCard, label: t("profile.myPlan"),      onClick: () => navigate("/perfil/plano")         },
    { icon: Settings,   label: t("profile.settings"),    onClick: () => navigate("/perfil/configuracoes") },
    { icon: Download,   label: t("profile.installApp"),  onClick: () => navigate("/instalar")             },
  ];

  return (
    <MobileLayout>
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-foreground">{t("profile.title")}</h1>
      </header>

      <div className="mt-6 flex flex-col items-center">
        <img
          src={avatarSrc}
          onError={handleAvatarError}
          alt="Avatar"
          className="h-20 w-20 rounded-full border-2 border-primary object-cover"
        />
        <h2 className="mt-3 text-lg font-bold text-foreground">{displayName}</h2>
        <Pill variant="soft" color="primary" className="mt-1.5">
          {t("profile.plan", { name: planName })}
        </Pill>
        {profile && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t("profile.stats", { videos: profile.videosWatched, hours: profile.totalHours })}
          </p>
        )}
      </div>

      <div className="mt-8 px-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0"
            >
              <Icon size={18} className="text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive"
        >
          <LogOut size={16} />
          {t("profile.logout")}
        </button>

        <div className="mt-8 flex justify-center">
          <img src={logo} alt="RastaHale" className="h-8 rounded opacity-50" />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Profile;
