import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import ts from "typescript";
import JSZip from "jszip";
import { Packer } from "docx";
function compile(name, imports = {}) {
  let js = ts.transpileModule(
    readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  for (const [from, to] of Object.entries(imports))
    js = js.replaceAll(`"${from}"`, JSON.stringify(to));
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const schema = compile("marketing-plan-schema", { zod: import.meta.resolve("zod") });
const modelUrl = compile("documents/model", {
  "../marketing-plan-schema": schema,
  "../marketing-plan": compile("marketing-plan"),
  "../pillars": compile("pillars"),
});
const { marketingDocument, reportDocument, overallScore, chartSvg } = await import(modelUrl);
const { buildWord, buildPdfDefinition, PAGE } = await import(
  compile("documents/render", { "./model": modelUrl, docx: import.meta.resolve("docx") })
);
const client = { company_name: "Organização de demonstração", city: "Natal" };
const stamp = "2026-09-15T12:00:00Z";
const scores = ["produto", "preco", "praca", "promocao", "performance"].map((pillar, i) => ({
  pillar,
  auto_score: i + 3,
  final_score: i === 4 ? null : i + 4,
  summary:
    "A análise identifica oportunidades para organizar a oferta e melhorar a clareza da comunicação com o cliente.",
  strengths: ["Atendimento próximo e conhecimento técnico da equipe."],
  problems: ["Falta de padronização do processo de acompanhamento."],
  risks: ["Dependência de poucos canais de aquisição."],
  opportunities: ["Organizar uma rotina de análise e revisão dos indicadores."],
  priority: "alta",
}));
const diagnostic = {
  id: "diagnostic-demo",
  title: "Diagnóstico de setembro",
  updated_at: stamp,
  created_at: stamp,
  status: "validado",
  executive_summary:
    "A organização tem condições de estruturar um processo comercial mais previsível. A prioridade é alinhar a oferta, a comunicação e o atendimento antes de ampliar o investimento em aquisição.",
  main_bottleneck: "promocao",
  main_opportunity:
    "Construir uma presença digital que esclareça a oferta e apoie conversas comerciais qualificadas.",
  token: "SECRET_MUST_NOT_EXPORT",
};
const plan = {
  id: "plan-demo",
  version: 4,
  status: "rascunho_ia",
  updated_at: stamp,
  ai_warning: "Revise hipóteses e metas propostas antes da aprovação.",
  content: {
    resumo_estrategico: diagnostic.executive_summary,
    notas_4p: scores.slice(0, 4).map((s) => ({ pilar: s.pillar, nota: s.final_score })),
    estrategia_central:
      "Educar o público sobre os critérios de escolha do serviço e simplificar o primeiro contato.",
    publico_estrategico:
      "Gestores de pequenas empresas que buscam previsibilidade na contratação de serviços.",
    objetivo_principal: {
      descricao: "Aumentar a qualidade das conversas comerciais.",
      kpi: "Conversas qualificadas",
      valor_atual: null,
      meta: 12,
      prazo: "2026-10-15",
    },
    canais: [
      {
        canal: "Instagram",
        objetivo: "Apoiar a avaliação de fornecedores.",
        estrategia: "Publicar orientações práticas e bastidores reais autorizados.",
        etapa: "ask",
        justificativa: "Complementar a pesquisa dos interessados antes do contato comercial.",
      },
    ],
    jornada_5a: [
      { etapa: "aware", nota: 3, diagnostico: "Baixa presença digital." },
      { etapa: "ask", nota: null, diagnostico: "Sem medição registrada." },
    ],
    acoes: [
      {
        titulo: "Organizar calendário editorial",
        descricao: "Planejar pautas com base nas dúvidas recorrentes do público.",
        objetivo: "Dar consistência à comunicação.",
        estrategia: "Sequência educativa antes do convite comercial.",
        kpi: "Conversas qualificadas",
        responsavel: "Equipe de marketing",
        prioridade: "alta",
        prazo: "2026-10-01",
      },
    ],
    riscos: ["Capacidade limitada de produção."],
    dados_insuficientes: ["Volume atual de contatos ainda não medido."],
  },
};
const action = {
  title: "Padronizar atendimento",
  description: "Registrar as principais dúvidas antes de enviar propostas.",
  owner_name: "Equipe comercial",
  priority: "alta",
  status: "planejado",
  pillar: "praca",
  due_date: "2026-10-01",
  expected_result: "Reduzir o tempo entre o primeiro contato e a proposta.",
};
const planDoc = marketingDocument(plan, client, diagnostic.title, stamp);
const reportDoc = reportDocument(diagnostic, client, scores, [action], stamp);
test("exports every marketing plan section, source and warning without inventing missing scores", () => {
  const text = JSON.stringify(planDoc);
  for (const expected of [
    "Instagram",
    "Revise hipóteses",
    "Organizar calendário",
    "Versão 4",
    "Dados insuficientes",
  ])
    assert.ok(text.includes(expected));
  assert.equal(overallScore(scores), 5.5);
  assert.equal(overallScore(scores.slice(0, 3)), null);
  assert.equal(
    overallScore(scores.map((s) => ({ ...s, final_score: null, auto_score: null }))),
    null,
  );
  assert.ok(chartSvg([{ label: "A < B & C", value: null }]).includes("A &lt; B &amp; C"));
  assert.ok(chartSvg([{ label: "Zero", value: 0 }]).includes("0,0"));
});
test("report includes narrative, action details and no diagnostic token", () => {
  const text = JSON.stringify(reportDoc);
  assert.ok(text.includes(action.expected_result));
  assert.ok(text.includes("01/10/2026"));
  assert.ok(!text.includes("SECRET_MUST_NOT_EXPORT"));
});
test("Word uses A4, technical-report margins, semantic headings, source captions and editable content", async () => {
  for (const model of [planDoc, reportDoc]) {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=",
      "base64",
    );
    const buffer = await Packer.toBuffer(await buildWord(model, async () => png));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml").async("string");
    assert.match(xml, /w:w="11906"/);
    assert.match(xml, /w:h="16838"/);
    assert.match(xml, /w:top="1701"/);
    assert.match(xml, /w:right="1134"/);
    assert.match(xml, /Fonte:/);
    assert.match(xml, /TOC/);
    assert.match(xml, /Heading1/);
    assert.match(xml, /SUMÁRIO/);
    assert.equal(PAGE.margin.left, 1701);
  }
});
test("PDF renders structured text and charts without screen capture", async () => {
  const { default: pdfMake } = await import("pdfmake/build/pdfmake.js");
  const { default: fonts } = await import("pdfmake/build/vfs_fonts.js");
  pdfMake.addVirtualFileSystem(fonts);
  const buffer = await pdfMake.createPdf(buildPdfDefinition(reportDoc)).getBuffer();
  assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
  assert.ok(buffer.length > 10000);
});
if (process.env.DOCUMENT_QA_DIR) {
  const { default: sharp } = await import(process.env.SHARP_MODULE);
  const { default: pdfMake } = await import("pdfmake/build/pdfmake.js");
  const { default: fonts } = await import("pdfmake/build/vfs_fonts.js");
  pdfMake.addVirtualFileSystem(fonts);
  mkdirSync(process.env.DOCUMENT_QA_DIR, { recursive: true });
  for (const [name, model] of [
    ["plano", planDoc],
    ["relatorio", reportDoc],
  ]) {
    writeFileSync(
      `${process.env.DOCUMENT_QA_DIR}/${name}.docx`,
      await Packer.toBuffer(
        await buildWord(
          model,
          async (svg) => new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer()),
        ),
      ),
    );
    writeFileSync(
      `${process.env.DOCUMENT_QA_DIR}/${name}.pdf`,
      await pdfMake.createPdf(buildPdfDefinition(model)).getBuffer(),
    );
  }
}
