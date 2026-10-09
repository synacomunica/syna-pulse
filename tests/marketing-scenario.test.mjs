import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { newScenario, calculateScenario, scenarioSchema, diagnosticScenario } = await import(
  compile("marketing-scenario")
);
const base = () => ({
  ...newScenario("2026-10"),
  revenue: 7000,
  target: 15000,
  ticket: 800,
  budget: 500,
  expectedCac: 200,
  margin: 20,
  acquisitionShare: 30,
  extraCapacity: 5,
  clickRate: 5,
  leadRate: 20,
  saleRate: 20,
});
test("acquisition limit is not substituted for expected cost; capacity limits additional sales", () => {
  const r = calculateScenario(base());
  assert.equal(r.sales, 10);
  assert.equal(r.cacLimit, 48);
  assert.equal(r.neededBudget, 2000);
  assert.equal(r.budgetSales, 2);
  assert.equal(r.projectedRevenue, 8600);
  assert.equal(r.warnings.length, 3);
  const limited = calculateScenario({ ...base(), budget: 10000 });
  assert.equal(limited.feasibleSales, 5);
});
test("reverse funnels ceil each stage including meetings", () => {
  const r = calculateScenario({
    ...base(),
    usesMeetings: true,
    meetingRate: 50,
    saleRate: 25,
    leadRate: 32,
  });
  assert.equal(r.meetings, 40);
  assert.equal(r.leads, 80);
  assert.equal(r.clicks, 250);
  assert.equal(r.reach, 5000);
});
test("missing values, zero conversion and achieved goals are distinct", () => {
  const blank = calculateScenario(newScenario("2026-10"));
  assert.equal(blank.gap, null);
  assert.equal(blank.sales, null);
  assert.equal(blank.cacLimit, null);
  assert.equal(calculateScenario({ ...base(), expectedCac: null }).neededBudget, null);
  assert.equal(calculateScenario({ ...base(), saleRate: 0 }).leads, null);
  assert.equal(calculateScenario({ ...base(), target: 5000 }).sales, 0);
  assert.equal(calculateScenario({ ...base(), budget: 0 }).feasibleSales, 0);
  assert.equal(calculateScenario({ ...base(), extraCapacity: 0 }).feasibleSales, 0);
});
test("schema rejects invalid ranges and imports only explicit numeric diagnostic answers", () => {
  assert.equal(scenarioSchema.safeParse({ ...base(), saleRate: 101 }).success, false);
  assert.equal(scenarioSchema.safeParse({ ...base(), budget: -1 }).success, false);
  assert.equal(scenarioSchema.safeParse({ ...base(), ticket: Infinity }).success, false);
  assert.deepEqual(
    diagnosticScenario([
      { question_key: "performance.faturamento_atual", value: 0 },
      { question_key: "preco.ticket", value: "800" },
      { question_key: "performance.faturamento_meta", value: "15 mil" },
    ]),
    { revenue: 0, ticket: 800 },
  );
});
