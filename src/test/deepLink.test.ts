import { describe, it, expect } from "vitest";
import { toInternalPath } from "@/lib/deepLink";

describe("toInternalPath (deep links)", () => {
  it("mantém caminho, query e hash de um App Link normal", () => {
    expect(
      toInternalPath("https://www.rastahalevirtualacademy.com/perfil/plano?checkout=success&session_id=cs_1"),
    ).toBe("/perfil/plano?checkout=success&session_id=cs_1");
    expect(toInternalPath("https://www.rastahalevirtualacademy.com/reset-senha#access_token=abc"))
      .toBe("/reset-senha#access_token=abc");
  });

  it("domínio sem caminho vai para a home", () => {
    expect(toInternalPath("https://www.rastahalevirtualacademy.com")).toBe("/");
  });

  it("URL sem caminho (esquema próprio) mantém só o hash, como antes", () => {
    expect(toInternalPath("com.rastahale.academy://reset-senha#access_token=abc")).toBe("#access_token=abc");
  });

  describe("open redirect: o destino nunca vira outro site", () => {
    it.each([
      ["https://www.rastahalevirtualacademy.com//evil.com/x", "/evil.com/x"],
      ["https://www.rastahalevirtualacademy.com///evil.com", "/evil.com"],
      ["https://www.rastahalevirtualacademy.com/\\evil.com", "/evil.com"],
      ["https://www.rastahalevirtualacademy.com/\\\\evil.com/a", "/evil.com/a"],
    ])("%s → %s", (input, expected) => {
      const path = toInternalPath(input);
      expect(path).toBe(expected);
      expect(path!.startsWith("//")).toBe(false);
      expect(path!.startsWith("/\\")).toBe(false);
    });

    it("javascript: não produz navegação", () => {
      const path = toInternalPath("javascript:alert(1)");
      // pathname de javascript: é o próprio código, sem barra inicial — nunca chega a ser URL absoluta
      expect(path === null || !/^[a-z][a-z0-9+.-]*:/i.test(path)).toBe(true);
    });
  });

  it("entrada inválida ou com caractere de controle é ignorada", () => {
    expect(toInternalPath("isso não é uma url")).toBeNull();
    expect(toInternalPath("")).toBeNull();
    expect(toInternalPath("https://x.com/a\u0000b")).toBeNull();
    expect(toInternalPath("https://x.com/a\nb")).toBeNull();
  });
});
