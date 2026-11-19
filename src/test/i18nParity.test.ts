import { describe, it, expect } from "vitest";
import pt from "@/i18n/locales/pt.json";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";

// CLAUDE.md: "paridade obrigatória" entre pt/en/es. Chave faltando aparece para o
// aluno como o nome cru da chave (ex.: "profile.settings.title").

type Tree = { [key: string]: string | string[] | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    } else {
      out.set(path, Array.isArray(value) ? value.join("\n") : String(value));
    }
  }
  return out;
}

// i18next pluraliza por sufixo, e cada idioma usa um conjunto diferente
// (en: _one/_other; pt/es: _one/_many/_other). Compara pela chave sem o sufixo.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (key: string) => key.replace(PLURAL_SUFFIX, "");

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]);
}

const catalogs = { pt: flatten(pt as Tree), en: flatten(en as Tree), es: flatten(es as Tree) };
const bases = (lang: keyof typeof catalogs) => new Set([...catalogs[lang].keys()].map(baseKey));

describe("i18n: paridade entre idiomas", () => {
  for (const other of ["en", "es"] as const) {
    it(`${other} tem todas as chaves do pt`, () => {
      const missing = [...bases("pt")].filter((k) => !bases(other).has(k));
      expect(missing, `faltam em ${other}:\n${missing.join("\n")}`).toEqual([]);
    });

    it(`${other} não tem chaves que o pt não tem`, () => {
      const extra = [...bases(other)].filter((k) => !bases("pt").has(k));
      expect(extra, `sobram em ${other}:\n${extra.join("\n")}`).toEqual([]);
    });

    it(`${other} usa as mesmas variáveis {{...}} do pt`, () => {
      const variablesOf = (lang: keyof typeof catalogs) => {
        const byKey = new Map<string, Set<string>>();
        for (const [key, text] of catalogs[lang]) {
          const set = byKey.get(baseKey(key)) ?? new Set<string>();
          placeholders(text).forEach((p) => set.add(p));
          byKey.set(baseKey(key), set);
        }
        return byKey;
      };
      const ptVars = variablesOf("pt");
      const otherVars = variablesOf(other);

      const mismatches: string[] = [];
      for (const [key, vars] of ptVars) {
        const theirs = otherVars.get(key);
        if (!theirs) continue; // chave ausente já é reportada acima
        const a = [...vars].sort().join(",");
        const b = [...theirs].sort().join(",");
        if (a !== b) mismatches.push(`${key}: pt={${a}} ${other}={${b}}`);
      }
      expect(mismatches, mismatches.join("\n")).toEqual([]);
    });
  }

  it("nenhuma tradução está vazia", () => {
    const empty: string[] = [];
    for (const [lang, catalog] of Object.entries(catalogs)) {
      for (const [key, text] of catalog) if (!text.trim()) empty.push(`${lang}:${key}`);
    }
    expect(empty).toEqual([]);
  });
});
