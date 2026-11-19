import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  /** Telas de formulário/configurações: no desktop ficam numa coluna estreita, não esticadas. */
  narrow?: boolean;
}

const MobileLayout = ({ children, narrow = false }: MobileLayoutProps) => (
  <div className={cn("app-page lg:pb-10 bg-background pb-20", narrow && "lg:max-w-2xl")}>
    {children}
  </div>
);

export default MobileLayout;
