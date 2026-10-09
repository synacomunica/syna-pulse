import { compile } from "./compile.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { readableValue, sourceLabel } = await import(compile("source-display"));
test("evidence display preserves zero, false, line breaks and unencoded legacy text", () => {
  assert.equal(readableValue("0"), "0");
  assert.equal(readableValue("false"), "Não");
  assert.equal(readableValue("null"), "");
  assert.equal(readableValue('""'), "");
  assert.equal(readableValue('"Uma linha\\nOutra linha"'), "Uma linha\nOutra linha");
  assert.equal(readableValue("Texto original"), "Texto original");
  assert.equal(readableValue('["A","B"]'), "A · B");
});
test("source labels use question wording and omit internal identifiers", () => {
  assert.equal(sourceLabel("Cadastro: company_name", {}), "Cadastro · Empresa");
  assert.equal(
    sourceLabel("Diagnóstico 420b2f1b-6d46-49e6-ac28-c19a259da32e, resposta produto.diferenciais", {
      "produto.diferenciais": "Quais são os diferenciais?",
    }),
    "Formulário · Quais são os diferenciais?",
  );
  assert.ok(!sourceLabel("Diagnóstico 420b2f1b-6d46-49e6-ac28-c19a259da32e", {}).includes("420b"));
});
