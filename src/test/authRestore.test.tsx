import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// O papel do usuário não pode vir do sessionStorage (o usuário o edita no DevTools).
const ctl = vi.hoisted(() => ({ mock: false, getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  get isMockModeEnabled() { return ctl.mock; },
  authProvider: {
    getSession: () => ctl.getSession(),
    onAuthStateChange: () => () => {},
    signInWithEmailPassword: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock("@/lib/push", () => ({ initPushNotifications: vi.fn() }));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const FORGED = { id: "u-1", email: "intruso@example.com", name: "Intruso", role: "admin" };

function Who() {
  const { user, loading } = useAuth();
  if (loading) return <div>carregando</div>;
  return <div data-testid="who">{user ? `${user.role}:${user.email}` : "anon"}</div>;
}

const renderApp = () => render(<AuthProvider><Who /></AuthProvider>);

describe("AuthProvider: usuário restaurado do sessionStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    ctl.mock = false;
    ctl.getSession.mockReset();
  });

  it("sem sessão real, um admin forjado no sessionStorage NÃO é restaurado", async () => {
    sessionStorage.setItem("rasta_auth_user", JSON.stringify(FORGED));
    ctl.getSession.mockResolvedValue({ user: null, session: null });

    renderApp();
    expect(await screen.findByTestId("who")).toHaveTextContent("anon");
  });

  it("se o provider falhar (rede/timeout), o forjado também NÃO é restaurado", async () => {
    sessionStorage.setItem("rasta_auth_user", JSON.stringify(FORGED));
    ctl.getSession.mockRejectedValue(new Error("rede caiu"));

    renderApp();
    expect(await screen.findByTestId("who")).toHaveTextContent("anon");
  });

  it("a sessão real do provider continua valendo", async () => {
    ctl.getSession.mockResolvedValue({
      user: { id: "u-2", email: "aluno@example.com", name: "Aluno", role: "user" },
      session: { provider: "supabase", session: {} },
    });

    renderApp();
    expect(await screen.findByTestId("who")).toHaveTextContent("user:aluno@example.com");
  });

  it("no modo demo (VITE_ENABLE_MOCK) a restauração local segue funcionando", async () => {
    ctl.mock = true;
    sessionStorage.setItem("rasta_auth_user", JSON.stringify({ ...FORGED, role: "user", email: "demo@example.com" }));
    ctl.getSession.mockResolvedValue({ user: null, session: null });

    renderApp();
    expect(await screen.findByTestId("who")).toHaveTextContent("user:demo@example.com");
  });
});
