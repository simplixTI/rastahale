import { describe, it, expect } from "vitest";
import { canWatchLessons, canWatchLesson } from "@/lib/access";

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

describe("canWatchLesson", () => {
  it("libera a aula de um módulo comprado avulso sem plano", () => {
    const owned = new Set(["v1"]);
    expect(canWatchLesson("user", "inativo", "v1", owned)).toBe(true);
    expect(canWatchLesson("user", "inativo", "v2", owned)).toBe(false);
    expect(canWatchLesson("user", "ativo", "v2", owned)).toBe(true);
  });
});
