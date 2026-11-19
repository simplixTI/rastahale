import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

// O papel vem de profiles.role (e do vínculo em instructors), nunca de user_metadata,
// que o próprio usuário grava no signUp.
const db = vi.hoisted(() => ({
  profile: null as null | { name: string; role: string; avatar_url: string | null },
  instructorRow: null as null | { id: string },
}));

vi.mock("@/lib/supabase", () => {
  const query = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: table === "profiles" ? db.profile : null, error: null }),
      maybeSingle: async () => ({ data: table === "instructors" ? db.instructorRow : null, error: null }),
    };
    return chain;
  };
  return { isSupabaseConfigured: true, supabase: { from: query, auth: {} } };
});

import { buildUser } from "@/lib/auth/supabaseProvider";

const authUser = (metadata: Record<string, unknown>) =>
  ({ id: "u-1", email: "pessoa@example.com", user_metadata: metadata }) as unknown as User;

describe("buildUser: de onde vem o papel", () => {
  beforeEach(() => {
    db.profile = null;
    db.instructorRow = null;
  });

  it("metadata dizendo role=admin NÃO promove quem não tem perfil", async () => {
    const user = await buildUser(authUser({ role: "admin", name: "Esperto" }));
    expect(user.role).toBe("user");
  });

  it("metadata dizendo role=admin NÃO sobrepõe o perfil de um aluno", async () => {
    db.profile = { name: "Aluno", role: "user", avatar_url: null };
    const user = await buildUser(authUser({ role: "admin" }));
    expect(user.role).toBe("user");
  });

  it.each(["user", "instructor", "admin"])("respeita profiles.role = %s", async (role) => {
    db.profile = { name: "Fulano", role, avatar_url: null };
    const user = await buildUser(authUser({}));
    expect(user.role).toBe(role);
  });

  it("aluno vinculado a um cadastro de professor vira instrutor", async () => {
    db.profile = { name: "Prof", role: "user", avatar_url: null };
    db.instructorRow = { id: "u-1" };
    const user = await buildUser(authUser({}));
    expect(user.role).toBe("instructor");
  });
});
