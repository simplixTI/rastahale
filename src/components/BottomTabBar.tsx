import { Home, Search, Users, Heart, Trophy, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/buscar", icon: Search, labelKey: "nav.search" },
  { path: "/professores", icon: Users, labelKey: "nav.teachers" },
  { path: "/favoritos", icon: Heart, labelKey: "nav.favorites" },
  { path: "/progresso", icon: Trophy, labelKey: "nav.ranking" },
  { path: "/perfil", icon: User, labelKey: "nav.profile" },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center gap-0.5 px-1 py-1 text-[10px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={23} strokeWidth={isActive ? 2 : 1.5} />
              <span className={cn("max-w-full truncate font-medium", isActive && "font-semibold")}>{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
