import { compile } from "./compile.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
    client_scopes: [],
    client_documents: [],
    client_planning_inputs: [],
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
test("missing AI key fails without inserting an empty plan", async () => {
  const previous = process.env.LOVABLE_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  delete process.env.LOVABLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const db = database("validado");
    await assert.rejects(generatePlan(db, "diagnostic"), /IA não configurada/);
    assert.equal(db.inserted.length, 0);
  } finally {
    if (previous !== undefined) process.env.LOVABLE_API_KEY = previous;
    if (gemini !== undefined) process.env.GEMINI_API_KEY = gemini;
  }
});

test("provider rejects an expired key with 400 without saving a template", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(
      JSON.stringify({
        error: {
          message: "API key expired. Please renew the API key.",
          status: "INVALID_ARGUMENT",
          details: [{ reason: "API_KEY_EXPIRED" }],
        },
      }),
      { status: 400 },
    );
  };
  try {
    const db = database("validado");
    await assert.rejects(generatePlan(db, "diagnostic"), /Chave de IA inválida ou expirada/);
    assert.equal(db.inserted.length, 0);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("Gemini key selects Google endpoint and parses a strategic plan", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-gemini-key";
  let called = false;
  globalThis.fetch = async (url, options) => {
    called = true;
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-gemini-key");
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.type, "json_schema");
    assert.ok(body.response_format.json_schema.schema.properties.jornada_5a);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                estrategia_central: "Resolver conversão",
                objetivo_principal: { descricao: "Melhorar conversão" },
                acoes: [
                  {
                    titulo: "Revisar atendimento",
                    objetivo: "Melhorar conversão",
                    estrategia: "Resolver conversão",
                    kpi: "conversao",
                  },
                ],
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    const db = database("validado");
    await generatePlan(db, "diagnostic");
    assert.ok(called);
    assert.equal(db.inserted[0].content.estrategia_central, "Resolver conversão");
    assert.match(db.inserted[0].ai_warning, /gerado por IA/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
