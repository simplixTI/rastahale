import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillColor = "primary" | "green" | "blue" | "red" | "amber" | "neutral";

// Badge/pílula padrão do app — estilo Shopee: cantos totalmente arredondados,
// texto pequeno em maiúsculas. "solid" = fundo cheio (callouts: NOVO, destaque);
// "soft" = fundo tingido (rótulos ambientes: nível, plano), melhor no tema dark.
const solid: Record<PillColor, string> = {
  primary: "bg-primary text-primary-foreground",
  green:   "bg-emerald-500 text-white",
  blue:    "bg-blue-500 text-white",
  red:     "bg-red-500 text-white",
  amber:   "bg-amber-500 text-black",
  neutral: "bg-secondary text-secondary-foreground",
};

const soft: Record<PillColor, string> = {
  primary: "bg-primary/15 text-primary",
  green:   "bg-emerald-500/15 text-emerald-400",
  blue:    "bg-blue-500/15 text-blue-400",
  red:     "bg-red-500/15 text-red-400",
  amber:   "bg-amber-500/15 text-amber-400",
  neutral: "bg-secondary text-muted-foreground",
};

interface PillProps {
  children:  ReactNode;
  color?:    PillColor;
  variant?:  "solid" | "soft";
  className?: string;
}

export function Pill({ children, color = "primary", variant = "solid", className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-tight",
        (variant === "solid" ? solid : soft)[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mapeia o nível técnico para a cor do badge. */
export function levelColor(level: string): PillColor {
  if (level === "Iniciante") return "green";
  if (level === "Intermediário") return "amber";
  if (level === "Avançado") return "red";
  return "neutral";
}

export default Pill;
