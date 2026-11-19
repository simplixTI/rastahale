import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

const originalLocation = window.location;
const reload = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  reload.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  vi.restoreAllMocks();
});

const Page = () => <div>PAGINA-CARREGADA</div>;

describe("lazyWithRetry (chunk some depois de um deploy)", () => {
  it("carrega a página normalmente", async () => {
    const Lazy = lazyWithRetry(() => Promise.resolve({ default: Page }));
    render(<Suspense fallback="carregando"><Lazy /></Suspense>);
    expect(await screen.findByText("PAGINA-CARREGADA")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("na primeira falha recarrega a página uma vez", async () => {
    const Lazy = lazyWithRetry(() => Promise.reject(new Error("Failed to fetch dynamically imported module")));
    render(<Suspense fallback="carregando"><Lazy /></Suspense>);

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem("rasta_chunk_reload")).toBe("1");
    // Não pisca erro na tela enquanto recarrega.
    expect(screen.getByText("carregando")).toBeInTheDocument();
  });

  it("se já recarregou, não entra em loop: mostra 'tentar de novo'", async () => {
    sessionStorage.setItem("rasta_chunk_reload", "1");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Lazy = lazyWithRetry(() => Promise.reject(new Error("Failed to fetch dynamically imported module")));

    render(
      <RouteErrorBoundary>
        <Suspense fallback="carregando"><Lazy /></Suspense>
      </RouteErrorBoundary>,
    );

    expect(await screen.findByRole("button")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("depois de carregar com sucesso, libera uma nova tentativa no futuro", async () => {
    sessionStorage.setItem("rasta_chunk_reload", "1");
    const Lazy = lazyWithRetry(() => Promise.resolve({ default: Page }));
    render(<Suspense fallback="carregando"><Lazy /></Suspense>);
    await screen.findByText("PAGINA-CARREGADA");
    expect(sessionStorage.getItem("rasta_chunk_reload")).toBeNull();
  });
});
