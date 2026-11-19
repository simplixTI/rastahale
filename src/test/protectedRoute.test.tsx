import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({ current: { user: null as null | { role: string }, loading: false } }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth.current }));
vi.mock("@/components/LoadingScreen", () => ({ LoadingScreen: () => <div>carregando…</div> }));

import { ProtectedRoute } from "@/components/ProtectedRoute";

type Variant = "aluno" | "admin" | "studio";

function renderAt(variant: Variant) {
  const guard = {
    aluno:  <ProtectedRoute><div>AREA-ALUNO</div></ProtectedRoute>,
    admin:  <ProtectedRoute adminOnly><div>AREA-ADMIN</div></ProtectedRoute>,
    studio: <ProtectedRoute instructorOnly><div>AREA-STUDIO</div></ProtectedRoute>,
  }[variant];

  return render(
    <MemoryRouter initialEntries={["/protegida"]}>
      <Routes>
        <Route path="/protegida" element={guard} />
        <Route path="/login" element={<div>TELA-LOGIN</div>} />
        <Route path="/" element={<div>TELA-HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const signedInAs = (role: string) => { auth.current = { user: { role }, loading: false }; };

describe("ProtectedRoute: quem entra em cada área", () => {
  beforeEach(() => { auth.current = { user: null, loading: false }; });

  it("visitante sem login vai para /login em qualquer área", () => {
    for (const variant of ["aluno", "admin", "studio"] as const) {
      const { unmount } = renderAt(variant);
      expect(screen.getByText("TELA-LOGIN")).toBeInTheDocument();
      unmount();
    }
  });

  it("enquanto a sessão carrega mostra a tela de loading (não expulsa nem libera)", () => {
    auth.current = { user: null, loading: true };
    renderAt("admin");
    expect(screen.getByText("carregando…")).toBeInTheDocument();
    expect(screen.queryByText("TELA-LOGIN")).not.toBeInTheDocument();
    expect(screen.queryByText("AREA-ADMIN")).not.toBeInTheDocument();
  });

  describe("área do aluno", () => {
    it.each(["user", "instructor", "admin"])("%s entra", (role) => {
      signedInAs(role);
      renderAt("aluno");
      expect(screen.getByText("AREA-ALUNO")).toBeInTheDocument();
    });
  });

  describe("/admin", () => {
    it("admin entra", () => {
      signedInAs("admin");
      renderAt("admin");
      expect(screen.getByText("AREA-ADMIN")).toBeInTheDocument();
    });

    it.each(["user", "instructor"])("%s é mandado para a home", (role) => {
      signedInAs(role);
      renderAt("admin");
      expect(screen.getByText("TELA-HOME")).toBeInTheDocument();
      expect(screen.queryByText("AREA-ADMIN")).not.toBeInTheDocument();
    });
  });

  describe("/studio", () => {
    it("instrutor entra", () => {
      signedInAs("instructor");
      renderAt("studio");
      expect(screen.getByText("AREA-STUDIO")).toBeInTheDocument();
    });

    it.each(["user", "admin"])("%s é mandado para a home", (role) => {
      signedInAs(role);
      renderAt("studio");
      expect(screen.getByText("TELA-HOME")).toBeInTheDocument();
      expect(screen.queryByText("AREA-STUDIO")).not.toBeInTheDocument();
    });
  });
});
