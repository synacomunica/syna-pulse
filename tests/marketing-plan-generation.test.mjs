import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
function compile(name, imports = {}) {
  let source = ts.transpileModule(
    readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  ).outputText;
  for (const [from, to] of Object.entries(imports))
    source = source.replaceAll(`"${from}"`, JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
const schema = compile("marketing-plan-schema", { zod: import.meta.resolve("zod") });
const vocabulary = compile("marketing-plan");
const { generatePlan } = await import(
  compile("marketing-plan.server", {
    "./marketing-plan-schema": schema,
    "./marketing-plan": vocabulary,
  })
);
function database(status) {
  const inserted = [];
  const records = {
    diagnostics: {
      id: "diagnostic",
      client_id: "client",
      status,
      submitted_at: "2026-09-01",
      analyzed_at: "2026-09-02",
      validated_at: "2026-09-03",
      validated_by: "reviewer",
      updated_at: "2026-09-03",
      executive_summary: "Resumo revisado",
    },
    clients: { id: "client" },
    answers: [{ question_key: "oferta", value: "Serviços" }],
    pillar_scores: [{ pillar: "produto", final_score: 7, auto_score: 6, summary: "Revisado" }],
    metric_values: [],
    goals: [],
    marketing_plans: [],
    action_items: [],
  };
  return {
    inserted,
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        insert(value) {
          inserted.push(value);
          query.inserted = true;
          return query;
        },
        single() {
          return query;
        },
        then(resolve) {
          return Promise.resolve({
            data: query.inserted ? { id: "new-plan" } : records[table],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
  };
}
test("generation refuses unvalidated diagnostic without inserting anything", async () => {
  const db = database("em_analise");
  await assert.rejects(generatePlan(db, "diagnostic"), /valide/);
  assert.equal(db.inserted.length, 0);
});
test("missing AI key preserves facts and leaves unknown metrics null", async () => {
  const previous = process.env.LOVABLE_API_KEY;
  delete process.env.LOVABLE_API_KEY;
  try {
    const db = database("validado");
    await generatePlan(db, "diagnostic");
    const plan = db.inserted[0];
    assert.match(plan.ai_warning, /IA não configurada/);
    assert.equal(plan.content.resumo_estrategico, "Resumo revisado");
    assert.equal(plan.content.notas_4p[0].nota, 7);
    assert.equal(plan.content.jornada_5a.length, 5);
    assert.ok(plan.content.jornada_5a.every((stage) => stage.nota === null));
    assert.ok(plan.content.funil.every((stage) => stage.valor === null));
    assert.equal(plan.content.acoes.length, 0);
  } finally {
    if (previous !== undefined) process.env.LOVABLE_API_KEY = previous;
  }
});
