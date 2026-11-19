import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, CreditCard, Video, DollarSign, LogOut, ChevronLeft, UserCircle2, Trophy,
  Layers, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  /** Só no menu lateral do desktop: a barra inferior do celular não comporta mais abas. */
  desktopOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/admin",               icon: LayoutDashboard, label: "Painel"      },
  { path: "/admin/videos",        icon: Video,           label: "Vídeos"      },
  { path: "/admin/modulos",       icon: Layers,          label: "Módulos",  desktopOnly: true },
  { path: "/admin/instrutores",   icon: UserCircle2,     label: "Instrutores" },
  { path: "/admin/usuarios",      icon: Users,           label: "Usuários"    },
  { path: "/admin/pagamentos",    icon: CreditCard,      label: "Pagamentos"  },
  { path: "/admin/planos",        icon: DollarSign,      label: "Planos"      },
  { path: "/admin/temporada",     icon: Trophy,          label: "Temporada"   },
  { path: "/admin/loja",          icon: ShoppingBag,     label: "Loja",     desktopOnly: true },
];

const mobileNavItems = navItems.filter((item) => !item.desktopOnly);

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  backTo?: string;
}

const AdminLayout = ({ children, title, showBack = false, backTo }: AdminLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Menu lateral — só no desktop (≥1024px). No celular a navegação fica embaixo. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo className="h-9 rounded-lg" />
          <span className="text-sm font-bold text-foreground">Administração</span>
        </div>

        <nav aria-label="Administração" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={18} aria-hidden="true" /> Sair
          </button>
        </div>
      </aside>

      <div className="mx-auto min-h-screen max-w-[430px] pb-20 md:max-w-3xl lg:ml-64 lg:max-w-none lg:pb-10">
        {/* Header — top-safe (e não top-0) para o header sticky parar abaixo da
            barra de status em vez de deslizar por baixo dela ao rolar. */}
        <header className="top-safe sticky z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-lg lg:px-8 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(showBack || backTo) && (
                <button
                  onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
                  aria-label="Voltar"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <Logo className="h-8 rounded-lg lg:hidden" />
              <h1 className="text-sm font-bold text-foreground lg:text-lg">{title}</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-muted-foreground lg:hidden"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 pt-4 lg:px-8 lg:pt-6">
          <div className="mx-auto w-full lg:max-w-6xl">{children}</div>
        </div>

        {/* Bottom nav — celular e tablet */}
        <nav
          aria-label="Administração"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden"
        >
          <div className="mx-auto flex max-w-[430px] items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:max-w-3xl">
            {mobileNavItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon size={21} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
                  <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AdminLayout;
