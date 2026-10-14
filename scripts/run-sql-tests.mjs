import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

try { loadEnvFile(".env.local"); } catch {}
const dir = "supabase/tests";
let failed = false;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".test.sql")).sort()) {
  const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
  const lines = [];
  try {
    await c.connect();
    const res = await c.query(readFileSync(`${dir}/${f}`, "utf8"));
    for (const r of [res].flat()) for (const row of r.rows ?? []) {
      const v = Object.values(row)[0];
      if (typeof v === "string" && /^(not ok|ok|1\.\.)/.test(v)) lines.push(v);
    }
  } catch (e) {
    console.log(`${f}: ERROR ${e.code ?? ""} ${String(e.message).replace(/postgres(ql)?:\/\/\S+/g, "<url>")}`);
    await c.query("rollback").catch(() => {});
    failed = true;
    continue;
  } finally { await c.end().catch(() => {}); }
  console.log(`# ${f}`); lines.forEach((l) => console.log(l));
  const plan = Number(lines.find((l) => l.startsWith("1.."))?.slice(3));
  const n = lines.filter((l) => /^(not )?ok/.test(l)).length;
  if (lines.some((l) => l.startsWith("not ok")) || plan !== n) { console.log(`FAIL: plan ${plan} vs ${n}`); failed = true; }
}
process.exit(failed ? 1 : 0);
