import { compile } from "./compile.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const planSchema = compile("marketing-plan-schema", { zod: import.meta.resolve("zod") });
const schema = compile("content-schedule", {
  zod: import.meta.resolve("zod"),
  "./marketing-plan-schema": planSchema,
});
const { validateSchedule, scheduleRequestSchema, scheduleAiSchema } = await import(schema);
const { generateSchedule } = await import(
  compile("content-schedule.server", {
    "./content-schedule": schema,
    "./marketing-plan-schema": planSchema,
  })
);
const request = {
  planId: "11111111-1111-4111-8111-111111111111",
  updatedAt: "2026-09-14T12:00:00+00:00",
  startDate: "2026-09-14",
  days: 30,
  count: 3,
  channels: ["Instagram"],
  formats: ["video", "estatico", "carrossel"],
};
const common = {
  data: "2026-09-15",
  canal: "Instagram",
  titulo: "Como planejar uma campanha com clareza",
  objetivo: "Estimular conversas sobre os desafios de aquisição",
  estrategia: "Educar antes de convidar para uma conversa comercial",
  etapa: "ask",
  mensagem: "Uma campanha começa pelo objetivo e pela oferta",
  cta: "Conte nos comentários qual etapa gera mais dúvidas.",
  legenda:
    "Antes de escolher o anúncio, defina o que você quer que seu público faça. Uma oferta clara e um próximo passo simples ajudam a organizar a campanha. Qual etapa gera mais dúvidas no seu negócio?",
  kpi: "Conversas qualificadas originadas pela publicação",
  orientacao_visual:
    "Formato vertical 4:5. Título no terço superior, ilustração de uma jornada no centro e CTA na faixa inferior. Use as cores oficiais da marca após validação e mantenha contraste alto.",
  acessibilidade: "Usar texto legível, contraste alto e descrição alternativa das imagens.",
  materiais_necessarios: ["Identidade visual aprovada"],
  cenas: [],
  texto_arte: "",
  cards: [],
};
const fixture = {
  titulo: "Cronograma editorial — Cliente de demonstração",
  diretriz_editorial:
    "Apresentar o método de planejamento com exemplos educativos, preparando o público para uma conversa consultiva. Este documento usa dados fictícios para validar a exportação.",
  alertas: ["Validar identidade visual antes da produção."],
  conteudos: [
    {
      ...common,
      formato: "video",
      cenas: [
        {
          duracao: "0–5 segundos",
          visual: "Plano médio de apresentador olhando para a câmera, fundo neutro.",
          fala: "Seu anúncio tem um objetivo claro ou só está no ar?",
          texto_tela: "Comece pelo objetivo",
          audio: "Voz direta, trilha instrumental discreta.",
        },
        {
          duracao: "5–20 segundos",
          visual:
            "Corte para um quadro com objetivo, oferta e próximo passo. Apresentador aponta cada item.",
          fala: "Defina a ação que espera do público, explique sua oferta e facilite o próximo passo. Conte nos comentários onde você trava.",
          texto_tela: "Objetivo → Oferta → Próximo passo",
          audio: "Manter a voz acima da trilha, sem efeitos sobre a fala.",
        },
      ],
    },
    {
      ...common,
      data: "2026-09-21",
      formato: "estatico",
      texto_arte:
        "Uma campanha começa antes do anúncio.\nObjetivo claro. Oferta relevante. Próximo passo simples.",
    },
    {
      ...common,
      data: "2026-09-28",
      formato: "carrossel",
      cards: [
        {
          titulo: "Antes de anunciar",
          texto: "Três perguntas para organizar sua campanha.",
          composicao:
            "Capa com título grande no centro, subtítulo abaixo e seta para o próximo card.",
        },
        {
          titulo: "O que seu público deve fazer?",
          texto:
            "Escolha uma ação principal: conversar, pedir uma proposta ou conhecer sua oferta.",
          composicao:
            "Pergunta na parte superior, três exemplos em blocos verticais com ícones simples.",
        },
        {
          titulo: "Qual é o próximo passo?",
          texto:
            "Um convite claro ajuda a conversa a começar. Qual etapa gera dúvidas no seu negócio?",
          composicao: "CTA destacado no centro, espaço livre ao redor e marca discreta no rodapé.",
        },
      ],
    },
  ],
};
test("validates complete format-specific content and rejects missing briefs", () => {
  assert.equal(validateSchedule(fixture, request).conteudos.length, 3);
  for (const [index, key, value] of [
    [0, "cenas", []],
    [1, "texto_arte", ""],
    [2, "cards", []],
    [0, "canal", "TikTok"],
    [0, "data", "2026-12-01"],
  ]) {
    const bad = structuredClone(fixture);
    bad.conteudos[index][key] = value;
    assert.throws(() => validateSchedule(bad, request));
  }
  assert.throws(() => scheduleRequestSchema.parse({ ...request, startDate: "2026-02-30" }));
  assert.throws(() => scheduleRequestSchema.parse({ ...request, count: 13 }));
  assert.deepEqual(scheduleAiSchema.properties.conteudos.items.properties.formato.enum, [
    ...request.formats,
    "stories",
  ]);
});
function database({ admin = true, stale = false, changed = false, cycle = null } = {}) {
  let reads = 0;
  return {
    from(table) {
      let history = false;
      const q = {
        lt() {
          history = true;
          return q;
        },
        select() {
          return q;
        },
        eq() {
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        single() {
          return q;
        },
        then(resolve) {
          const data =
            table === "editorial_cycles"
              ? history
                ? []
                : cycle
              : ["client_scopes", "client_documents", "client_planning_inputs"].includes(table)
                ? []
                : table === "user_roles"
                  ? [{ role: admin ? "admin" : "equipe" }]
                  : table === "clients"
                    ? { company_name: "Demonstração" }
                    : {
                        id: request.planId,
                        client_id: "client",
                        version: 2,
                        status: "rascunho_ia",
                        updated_at:
                          stale || (changed && reads++ > 0)
                            ? "2026-09-15T12:00:00+00:00"
                            : request.updatedAt,
                        content: {
                          estrategia_central: "Educação",
                          objetivo_principal: { descricao: "Conversas" },
                          canais: [{ canal: "Instagram" }],
                        },
                      };
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
}
test("server enforces admin, saved channels and source revision before calling AI", async () => {
  await assert.rejects(
    generateSchedule(database({ admin: false }), "user", request),
    /administradores/,
  );
  await assert.rejects(generateSchedule(database({ stale: true }), "user", request), /plano mudou/);
  await assert.rejects(
    generateSchedule(database(), "user", { ...request, channels: ["TikTok"] }),
    /Salve os canais/,
  );
});
test("server returns complete schedule, rechecks revision, and surfaces provider failures", async () => {
  const previous = globalThis.fetch,
    previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.response_format.type, "json_schema");
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(fixture) } }] }),
      };
    };
    const result = await generateSchedule(database(), "user", request);
    assert.equal(result.planVersion, 2);
    await assert.rejects(
      generateSchedule(database({ changed: true }), "user", request),
      /mudou durante/,
    );
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(generateSchedule(database(), "user", request), /Cota/);
  } finally {
    globalThis.fetch = previous;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
test("Word export produces an actual DOCX containing every production brief", async () => {
  const { buildScheduleDocument } = await import(
    compile("content-schedule-document", {
      docx: import.meta.resolve("docx"),
      "./content-schedule": schema,
    })
  );
  const { Packer } = await import("docx");
  const buffer = await Packer.toBuffer(
    buildScheduleDocument({
      client: "Cliente demonstração",
      planVersion: 2,
      planStatus: "rascunho_ia",
      sourceUpdatedAt: request.updatedAt,
      generatedAt: request.updatedAt,
      request,
      content: fixture,
    }),
  );
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  assert.ok(buffer.length > 8000);
  if (process.env.SCHEDULE_QA_DOCX) writeFileSync(process.env.SCHEDULE_QA_DOCX, buffer);
});

test("generation preserves approved topics and sends monthly direction to the provider", async () => {
  const { newTopic } = await import(compile("editorial-workflow"));
  const topics = fixture.conteudos.map((c) => ({
    ...newTopic(),
    theme: c.titulo,
    approach: c.titulo,
    audience: "Clientes",
    need: "Organizar campanhas",
    message: c.mensagem,
    cta: c.cta,
    evidence: "Plano revisado",
    checks: { priority: true, audience: true, evidence: true, feasible: true },
    status: "tema_aprovado",
    themeApproval: "Cliente, reunião 14/09",
    format: c.formato,
    channel: c.canal,
    publication: c.data,
  }));
  const workflow = {
    month: "2026-09",
    direction: {
      priority: "Campanhas",
      product: "Consultoria",
      audience: "Clientes",
      barrier: "Dúvidas",
      benefit: "Clareza",
      action: "Conversar",
      event: "",
      contentLimit: 3,
      visits: 0,
      stories: false,
      capacity: "Equipe interna",
    },
    topics,
    review: { repeat: "", adjust: "", questions: "", delays: "" },
  };
  const cycle = {
    id: "66666666-6666-4666-8666-666666666666",
    content: workflow,
    source_updated_at: request.updatedAt,
    updated_at: request.updatedAt,
  };
  const input = { ...request, cycleId: cycle.id, topicIds: topics.map((t) => t.id) };
  const previousFetch = globalThis.fetch,
    previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      const context = JSON.parse(body.messages[1].content);
      assert.match(context.metodologia.direction, /Consultoria/);
      assert.equal(context.metodologia.topics.length, 3);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ...fixture,
                  conteudos: fixture.conteudos.map((c, i) => ({ ...c, pauta_id: topics[i].id })),
                }),
              },
            },
          ],
        }),
      };
    };
    assert.equal(
      (await generateSchedule(database({ cycle }), "user", input)).content.conteudos.length,
      3,
    );
    cycle.content.topics[0].status = "selecionada";
    await assert.rejects(generateSchedule(database({ cycle }), "user", input), /temas aprovados/);
    cycle.content.topics[0].status = "tema_aprovado";
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(fixture) } }] }),
    });
    await assert.rejects(generateSchedule(database({ cycle }), "user", input), /alterou pautas/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
