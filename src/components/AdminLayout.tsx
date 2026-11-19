import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Logo from "@/components/Logo";

// A navegação inferior e o "Sair" moram no AdminTabBar, montado no App fora da
// área que anima na troca de tela.
const AdminLayout = ({ children, title, showBack = false, backTo, width = "medium" }: {
  children: ReactNode; title: string; showBack?: boolean; backTo?: string;
  /** Largura no computador: "wide" para painéis e listas, "medium" para formulários. */
  width?: "wide" | "medium";
}) => {
  const navigate = useNavigate();

  return (
    <div className={`mx-auto min-h-screen max-w-[430px] bg-background pb-24 ${width === "medium" ? "page-medium" : ""}`}>
      {/* Header — top-safe (e não top-0) para o header sticky parar abaixo da
          barra de status em vez de deslizar por baixo dela ao rolar. */}
      <header className="top-safe sticky z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(showBack || backTo) && (
              <button onClick={() => (backTo ? navigate(backTo) : navigate(-1))} aria-label="Voltar" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <ChevronLeft size={20} />
              </button>
            )}
            {/* No computador o logo já está no menu lateral. */}
            <Logo className="h-8 rounded-lg lg:hidden" />
            <span className="text-sm font-bold text-foreground lg:text-lg">{title}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-4">{children}</div>
    </div>
  );
};

export default AdminLayout;
