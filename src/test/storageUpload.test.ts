import { describe, it, expect } from "vitest";
import { storageSafeName } from "@/lib/storageUpload";

// O Supabase Storage recusa chaves com acentos/símbolos ("InvalidKey").
const VALID_KEY = /^[A-Za-z0-9._-]+$/;

describe("storageSafeName", () => {
  it("remove acentos e símbolos mantendo a extensão", () => {
    expect(storageSafeName("Aula Técnica — Básico.mp4")).toBe("Aula_Tecnica_Basico.mp4");
    expect(storageSafeName("Passagem de guarda (ç ã õ).MOV")).toBe("Passagem_de_guarda_c_a_o_.MOV");
  });

  it("mantém nomes que já são válidos", () => {
    expect(storageSafeName("Fundamentos_da_Base-Wrestling.mp4")).toBe("Fundamentos_da_Base-Wrestling.mp4");
  });

  it("sempre gera uma chave aceita pelo Storage", () => {
    for (const name of ["Fundamentos da Base Wrestling.mp4", "🥋 aula #1?.mkv", "...", "çãé"]) {
      expect(storageSafeName(name)).toMatch(VALID_KEY);
    }
  });
});
