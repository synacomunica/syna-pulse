import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { compile } from "./compile.mjs";
const dataUrl = (js) => `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
const adapter = dataUrl(
  `let db; export function setDatabase(value) { db = value; } export const supabaseAdmin = new Proxy({}, { get(_, name) { return db[name]; } });`,
);
const { setDatabase } = await import(adapter);
let js = ts.transpileModule(
  readFileSync(new URL("../src/lib/diagnostic.server.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
for (const [name, url] of Object.entries({
  "./questions": compile("questions"),
  "./pillars": compile("pillars"),
  "@/integrations/supabase/client.server": adapter,
}))
  js = js.replaceAll(JSON.stringify(name), JSON.stringify(url));
const { fetchByToken, saveAnswers, submitDiagnostic } = await import(dataUrl(js));
function database({ missing = false, fail, failUpdate = false } = {}) {
  const writes = [];
  const records = {
    diagnostics: missing
      ? null
      : { id: "diagnostic", client_id: "client", status: "pendente", current_step: 0 },
    clients: { company_name: "Empresa" },
    answers: [{ question_key: "oferta", value: "Serviços" }],
  };
  return {
    writes,
    from(table) {
      let writing = false;
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return query;
        },
        update(value) {
          writing = true;
          writes.push([table, value]);
          return query;
        },
        upsert(value) {
          writing = true;
          writes.push([table, value]);
          return query;
        },
        then(resolve) {
          return Promise.resolve({
            data: records[table],
            error:
              fail === table || (failUpdate && writing) ? new Error("database unavailable") : null,
          }).then(resolve);
        },
      };
      return query;
    },
  };
}
test("existing token loads company and saved answers; only absent tokens return null", async () => {
  setDatabase(database());
  assert.equal((await fetchByToken("token")).companyName, "Empresa");
  assert.deepEqual((await fetchByToken("token")).answers, { oferta: "Serviços" });
  setDatabase(database({ missing: true }));
  assert.equal(await fetchByToken("token"), null);
});
test("database and answer read failures are not treated as invalid links or empty answers", async () => {
  for (const fail of ["diagnostics", "clients", "answers"]) {
    setDatabase(database({ fail }));
    await assert.rejects(fetchByToken("token"), /Não foi possível/);
  }
});
test("failed step persistence and submission cannot report success", async () => {
  setDatabase(database({ failUpdate: true }));
  await assert.rejects(saveAnswers("token", {}, 1), /salvar a etapa/);
  const db = database({ failUpdate: true });
  setDatabase(db);
  await assert.rejects(submitDiagnostic("token"), /enviar o diagnóstico/);
  assert.equal(db.writes.length, 1);
});
