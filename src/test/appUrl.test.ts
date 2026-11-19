import { describe, it, expect } from "vitest";
import { pickAppUrl, DEFAULT_APP_URL } from "../../supabase/functions/_shared/appUrl";

const PROD = "https://www.rastahalevirtualacademy.com";

describe("pickAppUrl (retorno do Stripe)", () => {
  it("aceita as origens conhecidas", () => {
    expect(pickAppUrl({ origin: PROD, referer: null })).toBe(PROD);
    expect(pickAppUrl({ origin: "https://rastahalevirtualacademy.com", referer: null }))
      .toBe("https://rastahalevirtualacademy.com");
    expect(pickAppUrl({ origin: "http://localhost:8080", referer: null })).toBe("http://localhost:8080");
  });

  it("origem de terceiros cai no domínio de produção", () => {
    expect(pickAppUrl({ origin: "https://evil.example", referer: null })).toBe(DEFAULT_APP_URL);
    expect(pickAppUrl({ origin: "https://rastahalevirtualacademy.com.evil.example", referer: null }))
      .toBe(DEFAULT_APP_URL);
  });

  it("não deixa o Origin forjado vencer o Referer legítimo", () => {
    expect(pickAppUrl({ origin: "https://evil.example", referer: `${PROD}/perfil/plano` })).toBe(PROD);
  });

  it("usa o Referer quando não há Origin, só se for conhecido", () => {
    expect(pickAppUrl({ origin: null, referer: `${PROD}/perfil/plano?x=1` })).toBe(PROD);
    expect(pickAppUrl({ origin: null, referer: "https://evil.example/a" })).toBe(DEFAULT_APP_URL);
  });

  it("WebView do app (https://localhost) volta para o domínio verificado", () => {
    expect(pickAppUrl({ origin: "https://localhost", referer: null })).toBe(DEFAULT_APP_URL);
    expect(pickAppUrl({ origin: "capacitor://localhost", referer: null })).toBe(DEFAULT_APP_URL);
  });

  it("Origin 'null', vazio e lixo não quebram", () => {
    expect(pickAppUrl({ origin: "null", referer: null })).toBe(DEFAULT_APP_URL);
    expect(pickAppUrl({ origin: "", referer: "" })).toBe(DEFAULT_APP_URL);
    expect(pickAppUrl({ origin: "não é url", referer: "também não" })).toBe(DEFAULT_APP_URL);
  });

  it("APP_URL do ambiente vira o fallback e também é aceito", () => {
    const staging = "https://staging.rastahale.example";
    expect(pickAppUrl({ origin: "https://evil.example", referer: null, envAppUrl: staging })).toBe(staging);
    expect(pickAppUrl({ origin: staging, referer: null, envAppUrl: staging })).toBe(staging);
  });

  it("APP_URL com barra no fim ou caminho vira só a origem", () => {
    expect(pickAppUrl({ origin: null, referer: null, envAppUrl: `${PROD}/` })).toBe(PROD);
  });
});
