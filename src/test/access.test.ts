import { describe, it, expect } from "vitest";
import { canWatchLessons } from "@/lib/access";

describe("canWatchLessons", () => {
  it("libera a equipe, mesmo sem assinatura", () => {
    expect(canWatchLessons("admin", "pendente")).toBe(true);
    expect(canWatchLessons("instructor", "inativo")).toBe(true);
  });

  it("libera só o aluno com conta ativa", () => {
    expect(canWatchLessons("user", "ativo")).toBe(true);
    expect(canWatchLessons("user", "pendente")).toBe(false);
    expect(canWatchLessons("user", "inativo")).toBe(false);
    expect(canWatchLessons(undefined, undefined)).toBe(false);
  });
});
