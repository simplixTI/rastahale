import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
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

interface TabBarProps {
  /** Itens da doca inferior (celular). No máximo o que cabe numa linha. */
  items: TabItem[];
  ariaLabel: string;
  /** Itens do menu lateral (computador). Padrão: os mesmos da doca. */
  desktopItems?: TabItem[];
  /** Rótulo sob o logo no menu lateral (ex.: "Painel", "Studio"). */
  desktopTitle?: string;
  /** Rodapé do menu lateral (ex.: botão Sair). */
  desktopFooter?: ReactNode;
}

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

const Tricolor = ({ className }: { className?: string }) => (
  <span aria-hidden="true" className={cn("flex overflow-hidden rounded-full", className)}>
    <span className="flex-1 bg-[hsl(var(--brand-red))]" />
    <span className="flex-1 bg-[hsl(var(--brand-yellow))]" />
    <span className="flex-1 bg-[hsl(var(--brand-green))]" />
  </span>
);

const activeIndexOf = (items: TabItem[], pathname: string) =>
  items.findIndex((item) => (item.match ? item.match(pathname) : !!item.path && item.path === pathname));

/**
 * Navegação principal dos três perfis (aluno, professor, admin).
 *
 * Celular: uma "doca" flutuante no rodapé — o conteúdo rola por baixo, por
 * isso o fundo é translúcido com blur.
 * Computador (lg+): um menu lateral fixo. Lá cabe tudo, então o admin mostra
 * todos os destinos de uma vez em vez de esconder metade em "Mais".
 *
 * Nos dois, o item ativo ganha um realce que DESLIZA até ele (transform pelo
 * índice, sem medir o DOM) e as três faixas do logo marcam onde o usuário está.
 */
const TabBar = ({ items, ariaLabel, desktopItems, desktopTitle, desktopFooter }: TabBarProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const sideItems = desktopItems ?? items;
  const dockActive = activeIndexOf(items, pathname);
  const sideActive = activeIndexOf(sideItems, pathname);

  const go = (item: TabItem) => (item.onSelect ? item.onSelect() : item.path && navigate(item.path));

  return (
    <>
      {/* ── Celular: doca inferior ──────────────────────────────────────── */}
      <nav
        aria-label={ariaLabel}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--safe-area-inset-bottom,0px))] lg:hidden"
      >
        <div className="pointer-events-auto relative mx-auto flex max-w-[406px] items-stretch rounded-[26px] border border-border/70 bg-card/85 p-0.5 shadow-[var(--elev-dock)] backdrop-blur-xl backdrop-saturate-150">
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0.5 left-0.5 transition-[transform,opacity] duration-[460ms] motion-reduce:transition-opacity",
              EASE,
              dockActive >= 0 ? "opacity-100" : "opacity-0"
            )}
            style={{
              width: `calc((100% - 0.25rem) / ${items.length})`,
              transform: `translate3d(${Math.max(dockActive, 0) * 100}%, 0, 0)`,
            }}
          >
            <div className="h-full rounded-[22px] bg-foreground/[0.06]" />
            <Tricolor className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2" />
          </div>

          {items.map((item, index) => {
            const { path, icon: Icon, label } = item;
            const isActive = index === dockActive;
            return (
              <button
                key={path ?? label}
                type="button"
                onClick={() => go(item)}
                aria-label={label}
                aria-current={isActive && path ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] px-0 text-[0.625rem] leading-none",
                  "[transition-property:color,transform] duration-200 active:scale-[0.94] motion-reduce:active:scale-100",
                  EASE,
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  aria-hidden="true"
                  className={cn(
                    "transition-transform duration-[460ms] motion-reduce:transition-none",
                    EASE,
                    isActive ? "-translate-y-px scale-110" : "scale-100"
                  )}
                />
                {/* Peso fixo: negrito na aba ativa alargava o texto e cortava
                    "Professores" na barra de seis itens. */}
                <span className="max-w-full truncate font-medium tracking-[-0.03em]">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Computador: menu lateral ────────────────────────────────────── */}
      <nav
        aria-label={ariaLabel}
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/70 px-3 pb-4 pt-6 backdrop-blur-xl lg:flex"
      >
        <div className="mb-6 flex items-center gap-3 px-3">
          <Logo className="h-10 w-auto" />
          {desktopTitle && (
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{desktopTitle}</span>
          )}
        </div>

        <div className="relative flex flex-col gap-1">
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-0 h-11 transition-[transform,opacity] duration-[460ms] motion-reduce:transition-opacity",
              EASE,
              sideActive >= 0 ? "opacity-100" : "opacity-0"
            )}
            // 2.75rem de altura + 0.25rem de espaço entre itens
            style={{ transform: `translate3d(0, ${Math.max(sideActive, 0) * 3}rem, 0)` }}
          >
            <div className="h-full rounded-xl bg-foreground/[0.06]" />
            <Tricolor className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 flex-col" />
          </div>

          {sideItems.map((item, index) => {
            const { path, icon: Icon, label } = item;
            const isActive = index === sideActive;
            return (
              <button
                key={path ?? label}
                type="button"
                onClick={() => go(item)}
                aria-current={isActive && path ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm",
                  "[transition-property:color,transform] duration-200 active:scale-[0.98] motion-reduce:active:scale-100",
                  EASE,
                  isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} aria-hidden="true" className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {desktopFooter && <div className="mt-auto pt-4">{desktopFooter}</div>}
      </nav>
    </>
  );
};

export default TabBar;
