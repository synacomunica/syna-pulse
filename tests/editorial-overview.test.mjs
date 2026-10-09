import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { calendarDays, csvCell, scheduleCsv } = await import(compile("editorial-overview"));
const { newTopic, topicSchema } = await import(compile("editorial-workflow"));
test("calendar respects leap years and weekday offset without timezone shifts", () => {
  const days = calendarDays("2028-02");
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days[0], null);
  assert.equal(days[2], "2028-02-01");
  assert.equal(calendarDays("2026-10")[4], "2026-10-01");
});
test("CSV preserves quotes and multiline text while neutralizing spreadsheet formulas", () => {
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell('a"b'), '"a""b"');
  const t = { ...newTopic(), theme: '=HYPERLINK("x")', copy: "Linha 1\nLinha 2" };
  const csv = scheduleCsv([t], { formats: {}, purposes: {}, stages: {} });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Linha 1\nLinha 2"'));
  assert.ok(csv.includes("'=HYPERLINK"));
});
test("old topics load with empty optional timing and test fields", () => {
  const t = newTopic();
  delete t.publicationTime;
  delete t.testHypothesis;
  const result = topicSchema.parse(t);
  assert.equal(result.publicationTime, "");
  assert.equal(result.testHypothesis, "");
  assert.equal(topicSchema.safeParse({ ...t, publicationTime: "25:70" }).success, false);
});
