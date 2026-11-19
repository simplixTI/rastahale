import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contêiner das telas do aluno. No celular é sempre a coluna de 430px. No
 * computador (lg+) a largura depende do conteúdo — ver as regras em index.css:
 *  - "wide":   catálogos e grades (home, busca, professores)
 *  - "medium": leitura e painéis de uma coluna (ranking)
 *  - "narrow": formulários e menus (perfil, configurações)
 */
const MobileLayout = ({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "medium" | "narrow" }) => (
  <div
    className={cn(
      "mx-auto min-h-screen max-w-[430px] bg-background pb-24",
      width === "medium" && "page-medium",
      width === "narrow" && "page-narrow"
    )}
  >
    {children}
  </div>
);

export default MobileLayout;
