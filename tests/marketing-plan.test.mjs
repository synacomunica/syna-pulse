import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(new URL("../src/lib/marketing-plan-metrics.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { attainment, funnelRatios, journeyStatus, integrationId } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
test("missing and zero denominators never fabricate performance", () => {
  assert.equal(attainment(null, 300), null);
  assert.equal(attainment(230, 0), null);
  assert.ok(Math.abs(attainment(230, 300) - 76.6667) < 0.001);
  assert.equal(attainment(115, 120, true), 100);
  assert.ok(Math.abs(attainment(180, 150, true) - 83.3333) < 0.001);
});
test("PAR and BAR require verified comparable cohort", () => {
  const values = [
    { etapa: "aware", valor: 1000 },
    { etapa: "act", valor: 100 },
    { etapa: "advocate", valor: 40 },
  ];
  const context = { verificado: true, periodo: "2026-09", populacao: "clientes elegíveis" };
  assert.deepEqual(funnelRatios(values, context), { par: 0.1, bar: 0.04 });
  assert.deepEqual(funnelRatios(values, { ...context, verificado: false }), {
    par: null,
    bar: null,
  });
  assert.deepEqual(funnelRatios([{ etapa: "aware", valor: 0 }], context), { par: null, bar: null });
});
test("score boundaries and unknown values remain distinct", () => {
  assert.equal(journeyStatus(null), "Dados insuficientes");
  assert.equal(journeyStatus(0), "Crítico");
  assert.equal(journeyStatus(3.8), "Crítico");
  assert.equal(journeyStatus(5.9), "Atenção");
  assert.equal(journeyStatus(7.9), "Adequado");
  assert.equal(journeyStatus(8), "Forte");
});
test("repeated integration has same id, versions and items stay distinct", async () => {
  const id = await integrationId("plan-1", "action", 0);
  assert.equal(await integrationId("plan-1", "action", 0), id);
  assert.notEqual(await integrationId("plan-1", "action", 1), id);
  assert.notEqual(await integrationId("plan-2", "action", 0), id);
  assert.match(id, /^[a-f\d]{8}-[a-f\d]{4}-5[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
});
