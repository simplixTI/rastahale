import { Video, MessageCircle, Trophy, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/studio",          icon: Video,          label: "Aulas"    },
  { path: "/studio/feedback", icon: MessageCircle,  label: "Feedback" },
  { path: "/studio/ranking",  icon: Trophy,         label: "Ranking"  },
];

const StudioBottomBar = () => {
  const location      = useLocation();
  const navigate      = useNavigate();
  const { logout }    = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
            </button>
          );
        })}

        {/* logout */}
        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:text-red-400"
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </nav>
  );
};

export default StudioBottomBar;
