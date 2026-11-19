import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface TabItem {
  /** Rota de destino. Omitida em itens de ação (ex.: "Mais"). */
  path?: string;
  icon: LucideIcon;
  label: string;
  /** Decide se o item está ativo. Padrão: caminho exatamente igual. */
  match?: (pathname: string) => boolean;
  /** Ação em vez de navegação (abre um menu, por exemplo). */
  onSelect?: () => void;
}

/**
 * Barra de navegação inferior dos três perfis (aluno, professor, admin).
 *
 * É uma "doca" flutuante: o conteúdo rola por baixo dela, e por isso o fundo
 * é translúcido com blur. O item ativo ganha um realce que DESLIZA de uma aba
 * para a outra — a posição é um transform calculado pelo índice, então não há
 * medição de DOM — e, acima dele, as três faixas do logo (vermelho, amarelo,
 * verde): a assinatura da marca marcando onde o usuário está.
 */
const TabBar = ({ items, ariaLabel }: { items: TabItem[]; ariaLabel: string }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const activeIndex = items.findIndex((item) =>
    item.match ? item.match(pathname) : !!item.path && item.path === pathname
  );
  const hasActive = activeIndex >= 0;

  return (
    <nav
      aria-label={ariaLabel}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--safe-area-inset-bottom,0px))]"
    >
      <div className="pointer-events-auto relative mx-auto flex max-w-[406px] items-stretch rounded-[26px] border border-border/70 bg-card/85 p-1 shadow-[var(--elev-dock)] backdrop-blur-xl backdrop-saturate-150">
        {/* realce deslizante do item ativo */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 transition-[transform,opacity] duration-[460ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity",
            hasActive ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: `calc((100% - 0.5rem) / ${items.length})`,
            transform: `translate3d(${Math.max(activeIndex, 0) * 100}%, 0, 0)`,
          }}
        >
          <div className="h-full rounded-[22px] bg-foreground/[0.06]" />
          <div className="absolute left-1/2 top-0 flex h-[3px] w-7 -translate-x-1/2 overflow-hidden rounded-full">
            <span className="flex-1 bg-[hsl(var(--brand-red))]" />
            <span className="flex-1 bg-[hsl(var(--brand-yellow))]" />
            <span className="flex-1 bg-[hsl(var(--brand-green))]" />
          </div>
        </div>

        {items.map(({ path, icon: Icon, label, onSelect }, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={path ?? label}
              type="button"
              onClick={() => (onSelect ? onSelect() : path && navigate(path))}
              aria-label={label}
              aria-current={isActive && path ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] px-0.5 text-[10px] leading-none",
                "transition-colors duration-200 active:scale-[0.94] motion-reduce:active:scale-100",
                "[transition-property:color,transform] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.6}
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-[460ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                  isActive ? "-translate-y-px scale-110" : "scale-100"
                )}
              />
              {/* Peso fixo: mudar para negrito na aba ativa alargava o texto e
                  cortava "Professores" na barra de seis itens. */}
              <span className="max-w-full truncate font-medium tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
