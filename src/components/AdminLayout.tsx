import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, Video, DollarSign, LogOut, ChevronLeft, UserCircle2, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const navItems = [
  { path: "/admin",               icon: LayoutDashboard, label: "Painel"      },
  { path: "/admin/videos",        icon: Video,           label: "Vídeos"      },
  { path: "/admin/instrutores",   icon: UserCircle2,     label: "Instrutores" },
  { path: "/admin/usuarios",      icon: Users,           label: "Usuários"    },
  { path: "/admin/pagamentos",    icon: CreditCard,      label: "Pagamentos"  },
  { path: "/admin/planos",        icon: DollarSign,      label: "Planos"      },
  { path: "/admin/ranking",       icon: Trophy,          label: "Ranking"     },
];

const AdminLayout = ({ children, title, showBack = false }: { children: ReactNode; title: string; showBack?: boolean }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button onClick={() => navigate(-1)} className="text-muted-foreground">
                <ChevronLeft size={20} />
              </button>
            )}
            <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
            <span className="text-sm font-bold text-foreground">{title}</span>
          </div>
          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-4">{children}</div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[430px] items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
