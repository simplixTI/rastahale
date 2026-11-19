import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Video, Users, CreditCard, Menu,
  UserCircle2, DollarSign, Trophy, ShoppingBag, LogOut, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TabBar, { type TabItem } from "@/components/TabBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Sete destinos não cabem numa barra inferior (o último ficava cortado).
// Os quatro de uso diário ficam na barra; o resto abre em "Mais".
const moreItems = [
  { path: "/admin/instrutores", icon: UserCircle2, label: "Instrutores", hint: "Professores e acessos ao Studio" },
  { path: "/admin/planos",      icon: DollarSign,  label: "Planos",      hint: "Preços e o que cada plano libera" },
  { path: "/admin/temporada",   icon: Trophy,      label: "Temporada",   hint: "Ranking e período de pontuação" },
  { path: "/admin/loja",        icon: ShoppingBag, label: "Banner da loja", hint: "Carrossel da tela inicial" },
];

const AdminTabBar = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const inMore = moreItems.some((m) => pathname.startsWith(m.path));

  const items: TabItem[] = [
    { path: "/admin",            icon: LayoutDashboard, label: "Painel" },
    { path: "/admin/videos",     icon: Video,           label: "Vídeos", match: (p) => p.startsWith("/admin/videos") || p.startsWith("/admin/modulos") },
    { path: "/admin/usuarios",   icon: Users,           label: "Usuários" },
    { path: "/admin/pagamentos", icon: CreditCard,      label: "Pagamentos" },
    { icon: Menu, label: "Mais", match: () => inMore || open, onSelect: () => setOpen(true) },
  ];

  // Computador: cabe tudo no menu lateral, então nada fica escondido em "Mais".
  const desktopItems: TabItem[] = [
    ...items.slice(0, 4),
    ...moreItems.map(({ path, icon, label }) => ({ path, icon, label, match: (p: string) => p.startsWith(path) })),
  ];

  const signOut = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <TabBar
        items={items}
        desktopItems={desktopItems}
        desktopTitle="Painel"
        ariaLabel="Navegação do painel"
        desktopFooter={
          <button
            type="button"
            onClick={signOut}
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut size={19} aria-hidden="true" /> Sair da conta
          </button>
        }
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-3xl border-border bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-left text-base text-foreground">Mais</SheetTitle>
          </SheetHeader>

          <ul className="stagger space-y-2">
            {moreItems.map(({ path, icon: Icon, label, hint }) => {
              const active = pathname.startsWith(path);
              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => go(path)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left",
                      active && "border-foreground/30"
                    )}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                    </span>
                    <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sair fica separado da navegação, e com cor de ação destrutiva. */}
          <button
            type="button"
            onClick={signOut}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
          >
            <LogOut size={16} aria-hidden="true" /> Sair da conta
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminTabBar;
