import { z } from "zod";

const text = z.string().trim().max(6000);
export const functions = {
  atrair: "Atrair",
  explicar: "Explicar",
  confiar: "Gerar confiança",
  comprar: "Incentivar a compra",
} as const;
export const signals = {
  atrair: ["Alcance", "Visualizações", "Visitas ao perfil"],
  explicar: ["Retenção (%)", "Salvamentos", "Perguntas recebidas"],
  confiar: ["Respostas", "Conversas", "Feedback do atendimento"],
  comprar: ["Contatos", "Pedidos de orçamento", "Vendas rastreáveis"],
} as const;
export const stages = {
  banco: "Banco de ideias",
  selecionada: "Selecionada",
  tema_aprovado: "Tema aprovado",
  producao: "Em produção",
  peca_aprovada: "Peça aprovada",
  publicado: "Publicado",
} as const;
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Data inválida");
const optionalDate = z.union([z.literal(""), isoDate]);
export const topicSchema = z.object({
  id: z.string().uuid(),
  theme: text,
  approach: text,
  audience: text,
  need: text,
  message: text,
  cta: text,
  purpose: z.enum(["atrair", "explicar", "confiar", "comprar"]),
  source: text,
  evidence: text,
  checks: z.object({
    priority: z.boolean(),
    audience: z.boolean(),
    evidence: z.boolean(),
    feasible: z.boolean(),
  }),
  status: z.enum([
    "banco",
    "selecionada",
    "tema_aprovado",
    "producao",
    "peca_aprovada",
    "publicado",
  ]),
  themeApproval: text,
  pieceApproval: text,
  scopeItemId: text.default(""),
  format: z.enum(["", "video", "estatico", "carrossel", "stories"]),
  channel: text,
  formatReason: text,
  materials: text,
  owner: text,
  publication: optionalDate,
  scriptDue: optionalDate,
  captureDue: optionalDate,
  productionDue: optionalDate,
  approvalDue: optionalDate,
  captureGroup: text,
  location: text,
  person: text,
  equipment: text,
  copy: z.string().trim().max(60000),
  visual: text,
  publishedUrl: text,
  results: z.record(text),
  learning: text,
});
export const workflowSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  direction: z.object({
    priority: text,
    product: text,
    audience: text,
    barrier: text,
    benefit: text,
    action: text,
    event: text,
    contentLimit: z.number().int().min(1).max(200),
    visits: z.number().int().min(0).max(100),
    stories: z.boolean(),
    capacity: text,
  }),
  topics: z.array(topicSchema).max(300),
  review: z.object({ repeat: text, adjust: text, questions: text, delays: text }),
});
export type Workflow = z.infer<typeof workflowSchema>;
export type Topic = z.infer<typeof topicSchema>;
export function newTopic(): Topic {
  return topicSchema.parse({
    id: crypto.randomUUID(),
    theme: "",
    approach: "",
    audience: "",
    need: "",
    message: "",
    cta: "",
    purpose: "atrair",
    source: "",
    evidence: "",
    checks: { priority: false, audience: false, evidence: false, feasible: false },
    status: "banco",
    themeApproval: "",
    pieceApproval: "",
    format: "",
    channel: "",
    formatReason: "",
    materials: "",
    owner: "",
    publication: "",
    scriptDue: "",
    captureDue: "",
    productionDue: "",
    approvalDue: "",
    captureGroup: "",
    location: "",
    person: "",
    equipment: "",
    copy: "",
    visual: "",
    publishedUrl: "",
    results: {},
    learning: "",
  });
}
export function directionSentence(d: Workflow["direction"]) {
  return `Neste mês, vamos divulgar ${d.product || "[produto/serviço]"} para ${d.audience || "[público]"}, mostrando ${d.benefit || "[benefício/diferencial]"}, para incentivar ${d.action || "[ação esperada]"}.`;
}
export function validateWorkflow(raw: unknown): Workflow {
  const w = workflowSchema.parse(raw);
  const selected = w.topics.filter((t) => t.status !== "banco");
  if (new Set(w.topics.map((t) => t.id)).size !== w.topics.length)
    throw new Error("Pautas duplicadas.");
  if (selected.length > w.direction.contentLimit)
    throw new Error("Quantidade selecionada excede os conteúdos previstos para o mês.");
  if (
    selected.length &&
    [
      w.direction.priority,
      w.direction.product,
      w.direction.audience,
      w.direction.barrier,
      w.direction.benefit,
      w.direction.action,
      w.direction.capacity,
    ].some((v) => !v)
  )
    throw new Error("Complete a direção do mês e a capacidade antes de selecionar pautas.");
  const groups = new Set<string>();
  for (const t of selected) {
    if (
      !Object.values(t.checks).every(Boolean) ||
      [t.theme, t.approach, t.audience, t.need, t.message, t.cta, t.evidence].some((v) => !v)
    )
      throw new Error(
        `Pauta “${t.theme}”: complete a abordagem, evidência e os quatro critérios de seleção.`,
      );
    if (t.status !== "selecionada" && !t.themeApproval)
      throw new Error(`Registre quem aprovou o tema “${t.theme}” e quando.`);
    if (t.format === "stories" && !w.direction.stories)
      throw new Error("Stories não estão incluídos no escopo deste mês.");
    if (t.publication && !t.publication.startsWith(w.month))
      throw new Error("Publicação fora do mês selecionado.");
    const dates = [t.scriptDue, t.captureDue, t.productionDue, t.approvalDue, t.publication].filter(
      Boolean,
    );
    if (dates.some((d, i) => i > 0 && d < dates[i - 1]!))
      throw new Error(
        `Prazos de “${t.theme}” devem seguir roteiro → captação → produção → aprovação → publicação.`,
      );
    if (t.captureDue) {
      if (![t.captureGroup, t.location, t.person, t.equipment].every(Boolean))
        throw new Error("Identifique visita, local, pessoa e equipamento da captação.");
      groups.add(`${t.captureDue}|${t.captureGroup}`);
    }
    if (
      ["producao", "peca_aprovada", "publicado"].includes(t.status) &&
      [
        t.format,
        t.channel,
        t.formatReason,
        t.owner,
        t.scriptDue,
        t.productionDue,
        t.approvalDue,
        t.publication,
        t.materials,
      ].some((v) => !v)
    )
      throw new Error(
        `Complete formato, responsável, materiais e prazos de “${t.theme}” antes da produção.`,
      );
    if (["peca_aprovada", "publicado"].includes(t.status) && (!t.pieceApproval || !t.copy))
      throw new Error("Registre a peça e a aprovação antes de publicar.");
    if (t.status === "publicado" && !t.publishedUrl)
      throw new Error("Registre o link ou referência da publicação.");
  }
  if (groups.size > w.direction.visits)
    throw new Error(
      "Captações excedem as visitas previstas. Agrupe por visita e data ou ajuste o escopo.",
    );
  return w;
}
export function backwardDates(publication: string, productionDays = 3, approvalDays = 2) {
  const subtract = (days: number) => {
    const d = new Date(`${publication}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  return {
    publication,
    approvalDue: subtract(1),
    productionDue: subtract(approvalDays),
    captureDue: subtract(approvalDays + productionDays),
    scriptDue: subtract(approvalDays + productionDays + 1),
  };
}
export function nextMonth(w: Workflow): Workflow {
  const d = new Date(`${w.month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return {
    ...w,
    month: d.toISOString().slice(0, 7),
    topics: w.topics
      .filter((t) => t.status === "banco")
      .map((t) => ({ ...t, id: crypto.randomUUID() })),
    review: { repeat: "", adjust: "", questions: "", delays: "" },
  };
}

// Approved messages cannot silently change while retaining approvals.
export function validateRevision(previous: Workflow | null, next: Workflow, planApproved: boolean) {
  if (next.topics.some((t) => ["peca_aprovada", "publicado"].includes(t.status)) && !planApproved)
    throw new Error("Aprove o plano de marketing antes de aprovar peças ou publicar.");
  if (!previous) return;
  if (
    JSON.stringify(previous.direction) !== JSON.stringify(next.direction) &&
    next.topics.some((t) => t.status !== "banco")
  )
    throw new Error(
      "Devolva as pautas ao banco antes de mudar a direção ou capacidade do mês. Depois, selecione e aprove novamente.",
    );
  for (const t of next.topics) {
    const old = previous.topics.find((x) => x.id === t.id);
    if (!old || old.status === "banco" || t.status === "banco") continue;
    const messageKeys = [
      "theme",
      "approach",
      "audience",
      "need",
      "message",
      "cta",
      "purpose",
      "evidence",
      "checks",
    ] as const;
    if (messageKeys.some((k) => JSON.stringify(old[k]) !== JSON.stringify(t[k])))
      throw new Error("Devolva a pauta ao banco para alterar a mensagem selecionada.");
    if (
      ["peca_aprovada", "publicado"].includes(old.status) &&
      ["peca_aprovada", "publicado"].includes(t.status) &&
      ["copy", "visual", "format", "channel"].some(
        (k) => old[k as keyof Topic] !== t[k as keyof Topic],
      )
    )
      throw new Error("Reabra a peça para produção antes de alterar um conteúdo aprovado.");
  }
}
