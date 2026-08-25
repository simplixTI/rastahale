/**
 * RastaHale Academy — Aplica migrations SQL no Postgres do Supabase via pooler.
 *
 * Diferente do scripts/migrate.mjs (que depende da Management API e retorna 401
 * sem um personal access token), este script conecta direto no banco usando a
 * connection string de supabase/.temp/pooler-url (gerada pelo Supabase CLI).
 *
 * Uso:
 *   node scripts/apply-migrations.mjs            # aplica 013..016
 *   node scripts/apply-migrations.mjs 013 016    # só as listadas
 *
 * Cada migration roda numa transaction própria; em erro, aborta na hora.
 */

import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const poolerUrl = readFileSync(join(root, "supabase/.temp/pooler-url"), "utf8").trim();

const wanted = process.argv.slice(2);
const files = readdirSync(join(root, "supabase/migrations"))
  .filter((f) => /^\d{3}_.*\.sql$/.test(f))
  .filter((f) => (wanted.length ? wanted.some((n) => f.startsWith(n.padStart(3, "0"))) : Number(f.slice(0, 3)) >= 13))
  .sort();

if (!files.length) {
  console.log("Nenhuma migration correspondente.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: poolerUrl });

async function main() {
  await client.connect();
  console.log(`Conectado. Aplicando ${files.length} migration(s)...\n`);

  for (const f of files) {
    const sql = readFileSync(join(root, "supabase/migrations", f), "utf8");
    process.stdout.write(`   ⏳  ${f} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log("✅");
    } catch (e) {
      await client.query("rollback");
      console.log("❌");
      console.error(`\n❌  Falha em ${f}: ${e.message}`);
      console.error("    Rollback feito. Corrija e rode novamente.");
      process.exit(1);
    }
  }
  console.log("\n🎉  Migrations aplicadas.");
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => client.end());
