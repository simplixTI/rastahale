import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Trava de regressão sobre o SQL versionado. Não substitui rodar
// supabase/tests/019_profiles_security.sql no banco, mas impede que uma migration
// futura reabra silenciosamente as duas escaladas de privilégio fechadas na 019.

const dir = path.resolve(process.cwd(), "supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const stripComments = (sql: string) => sql.replace(/--.*$/gm, "");
const read = (file: string) => stripComments(fs.readFileSync(path.join(dir, file), "utf8"));

describe("migrations: handle_new_user", () => {
  const definers = files.filter((f) => /function\s+public\.handle_new_user\s*\(/i.test(read(f)));

  it("existe pelo menos uma definição", () => {
    expect(definers.length).toBeGreaterThan(0);
  });

  it("a definição mais recente não lê o papel de raw_user_meta_data", () => {
    const latest = definers[definers.length - 1];
    expect(latest, "migration mais recente que define handle_new_user").toBeDefined();
    const sql = read(latest);
    // raw_user_meta_data é escrito pelo próprio usuário no signUp.
    expect(sql).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/i);
    expect(sql).not.toMatch(/raw_user_meta_data\s*->\s*'role'/i);
  });
});

describe("migrations: trigger que protege profiles", () => {
  const file = files.find((f) => f.startsWith("019_"));
  const sql = file ? read(file) : "";

  it("a migration 019 existe", () => {
    expect(file).toBeDefined();
  });

  it.each([
    "role",
    "status",
    "plan_name",
    "email",
    "subscription_status",
    "stripe_customer_id",
    "stripe_subscription_id",
    "current_period_end",
  ])("barra a troca de %s por usuário comum", (column) => {
    expect(sql).toMatch(new RegExp(`new\\.${column}\\s+is distinct from old\\.${column}`, "i"));
  });

  it("libera service role/SQL Editor (auth.uid() nulo) e admin", () => {
    expect(sql).toMatch(/auth\.uid\(\)\s+is null/i);
    expect(sql).toMatch(/public\.is_admin\(\)/i);
  });

  it("dispara em INSERT e UPDATE, antes da gravação", () => {
    expect(sql).toMatch(/before insert or update on public\.profiles/i);
  });

  it("no INSERT de usuário comum força papel de aluno e zera o Stripe", () => {
    expect(sql).toMatch(/new\.role\s*:=\s*'user'/i);
    expect(sql).toMatch(/new\.stripe_customer_id\s*:=\s*null/i);
  });

  it("nenhuma migration posterior remove o trigger", () => {
    const later = files.filter((f) => file && f > file);
    for (const f of later) {
      expect(read(f), f).not.toMatch(/drop trigger[^;]*trg_protect_profile_columns/i);
    }
  });
});
