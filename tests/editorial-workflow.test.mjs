import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { newTopic, validateWorkflow, validateRevision, backwardDates, nextMonth } = await import(
  compile("editorial-workflow")
);
const topic = () => ({
  ...newTopic(),
  theme: "Ar-condicionado",
  approach: "Ligado mas demora para gelar?",
  audience: "Proprietários",
  need: "Ambiente quente",
  message: "Verifique manutenção e dimensionamento",
  cta: "Agende uma avaliação",
  evidence: "Orientação técnica revisada",
  checks: { priority: true, audience: true, evidence: true, feasible: true },
  status: "selecionada",
});
const cycle = () => ({
  month: "2026-10",
  direction: {
    priority: "Vender manutenção",
    product: "Manutenção",
    audience: "Proprietários",
    barrier: "Dúvida sobre defeito",
    benefit: "Diagnóstico técnico",
    action: "Agendar",
    event: "",
    contentLimit: 2,
    visits: 1,
    stories: false,
    capacity: "Uma equipe e uma visita",
  },
  topics: [topic()],
  review: { repeat: "", adjust: "", questions: "", delays: "" },
});
test("selection requires direction, evidence and all four checks", () => {
  assert.equal(validateWorkflow(cycle()).topics.length, 1);
  for (const key of ["priority", "audience", "evidence", "feasible"]) {
    const w = cycle();
    w.topics[0].checks[key] = false;
    assert.throws(() => validateWorkflow(w), /critérios/);
  }
  const w = cycle();
  w.direction.product = "";
  assert.throws(() => validateWorkflow(w), /direção/);
});
test("approval gates, scope and scheduling are enforced", () => {
  const w = cycle(),
    t = w.topics[0];
  t.status = "producao";
  assert.throws(() => validateWorkflow(w), /aprovou/);
  Object.assign(t, { themeApproval: "Maria, 30/09, reunião", format: "stories" });
  assert.throws(() => validateWorkflow(w), /Stories/);
  Object.assign(t, {
    format: "video",
    channel: "Instagram",
    formatReason: "Demonstrar",
    owner: "Equipe",
    materials: "Equipamento real",
    ...backwardDates("2026-10-15"),
    captureGroup: "Visita 1",
    location: "Loja",
    person: "Técnico",
    equipment: "Celular",
  });
  assert.equal(validateWorkflow(w).topics[0].status, "producao");
  t.approvalDue = "2026-10-01";
  assert.throws(() => validateWorkflow(w), /Prazos/);
  t.approvalDue = "2026-10-14";
  t.status = "peca_aprovada";
  assert.throws(() => validateWorkflow(w), /aprovação/);
  t.copy = "Roteiro";
  t.pieceApproval = "Maria, 14/10";
  t.status = "publicado";
  assert.throws(() => validateWorkflow(w), /referência/);
  t.publishedUrl = "Publicação registrada";
  validateWorkflow(w);
});
test("capacity counts grouped visits and keeps bank ideas out of monthly quantity", () => {
  const w = cycle();
  w.direction.contentLimit = 1;
  w.topics.push({ ...newTopic(), theme: "Ideia futura" });
  validateWorkflow(w);
  w.topics.push(topic());
  assert.throws(() => validateWorkflow(w), /Quantidade/);
  w.topics.pop();
  Object.assign(w.topics[0], {
    captureDue: "2026-10-10",
    captureGroup: "A",
    location: "Loja",
    person: "Técnico",
    equipment: "Celular",
  });
  w.direction.visits = 0;
  assert.throws(() => validateWorkflow(w), /visitas/);
});
test("changing selected messages or direction requires renewed selection", () => {
  const old = cycle(),
    next = structuredClone(old);
  next.topics[0].message = "Outra promessa";
  assert.throws(() => validateRevision(old, next, true), /banco/);
  next.topics[0].status = "banco";
  validateRevision(old, next, true);
  const revised = structuredClone(old);
  revised.direction.product = "Outro serviço";
  assert.throws(() => validateRevision(old, revised, true), /direção/);
  revised.topics[0].status = "peca_aprovada";
  assert.throws(() => validateRevision(null, revised, false), /plano/);
});
test("next month rolls over year and carries only bank ideas with new identities", () => {
  const w = cycle();
  w.month = "2026-12";
  w.topics.push({ ...newTopic(), theme: "Futuro" });
  w.review.repeat = "Demonstrações";
  const next = nextMonth(w);
  assert.equal(next.month, "2027-01");
  assert.equal(next.topics.length, 1);
  assert.notEqual(next.topics[0].id, w.topics[1].id);
  assert.equal(next.review.repeat, "");
  assert.equal(w.review.repeat, "Demonstrações");
});
