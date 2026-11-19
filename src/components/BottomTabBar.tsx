import { Home, Search, Users, Heart, Trophy, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

const tabs = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/buscar", icon: Search, labelKey: "nav.search" },
  { path: "/professores", icon: Users, labelKey: "nav.teachers" },
  { path: "/favoritos", icon: Heart, labelKey: "nav.favorites" },
  { path: "/progresso", icon: Trophy, labelKey: "nav.ranking" },
  { path: "/perfil", icon: User, labelKey: "nav.profile" },
];

/**
 * Navegação principal do aluno. É a mesma <nav> nos dois formatos:
 *  - celular/tablet: barra fixa embaixo, com ícone sobre o rótulo;
 *  - desktop (≥1024px): menu lateral fixo à esquerda, ícone ao lado do rótulo
 *    (o App reserva a largura dele com lg:pl-60).
 */
const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.bottomNavigation")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:inset-y-0 lg:right-auto lg:w-60 lg:border-r lg:border-t-0 lg:bg-card lg:backdrop-blur-none"
    >
      <div className="hidden items-center gap-3 px-5 py-5 lg:flex">
        <Logo className="h-9 rounded-lg" />
        <span className="text-sm font-bold text-foreground">RastaHale</span>
      </div>

      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:max-w-3xl lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:px-3 lg:py-2">
        {tabs.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          const label = t(labelKey);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[10px] transition-colors",
                "lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5 lg:text-sm",
                isActive
                  ? "text-primary lg:bg-primary/10"
                  : "text-muted-foreground lg:hover:bg-muted lg:hover:text-foreground"
              )}
            >
              <Icon size={23} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" className="lg:size-5" />
              <span className={cn("max-w-full truncate font-medium", isActive && "font-semibold")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
