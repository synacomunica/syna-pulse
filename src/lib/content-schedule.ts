import { z } from "zod";
import { aiSchema } from "./marketing-plan-schema";

const text = z.string().trim().min(1).max(6000);
export const contentFormats = ["video", "estatico", "carrossel"] as const;
export const formatNames = { video: "Vídeo", estatico: "Post estático", carrossel: "Carrossel" };
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Data inválida");
export const scheduleRequestSchema = z
  .object({
    planId: z.string().uuid(),
    updatedAt: z.string().datetime({ offset: true }),
    startDate: date,
    days: z.number().int().min(7).max(90),
    count: z.number().int().min(1).max(12),
    channels: z.array(text.max(150)).min(1).max(12),
    formats: z.array(z.enum(contentFormats)).min(1).max(3),
  })
  .refine(
    (value) => value.count >= value.formats.length,
    "Escolha ao menos um conteúdo por formato.",
  );
export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;
export const scheduleSchema = z.object({
  titulo: text,
  diretriz_editorial: text,
  alertas: z.array(text).max(20),
  conteudos: z
    .array(
      z.object({
        publico: text.default("A confirmar"),
        necessidade: text.default("A confirmar"),
        evidencia_ids: z.array(z.string()).default([]),
        destino: text.default("A confirmar"),
        proximo_passo: text.default("A confirmar"),
        uso_comercial: text.default("A confirmar"),
        dependencias_aprovacao: z.array(z.string()).default([]),
        scopeItemId: z.string().default(""),
        data: date,
        canal: text,
        formato: z.enum(contentFormats),
        titulo: text,
        objetivo: text,
        estrategia: text,
        etapa: z.enum(["aware", "appeal", "ask", "act", "advocate"]),
        mensagem: text,
        cta: text,
        legenda: text,
        kpi: text,
        orientacao_visual: text,
        acessibilidade: text,
        materiais_necessarios: z.array(text).min(1).max(15),
        cenas: z
          .array(
            z.object({ duracao: text, visual: text, fala: text, texto_tela: text, audio: text }),
          )
          .max(20),
        texto_arte: z.string().max(6000),
        cards: z.array(z.object({ titulo: text, texto: text, composicao: text })).max(10),
      }),
    )
    .min(1)
    .max(12),
});

// Keep validation refinements local; the provider receives the structural schema.
export const scheduleAiSchema = aiSchema(scheduleSchema);
export type ContentSchedule = z.infer<typeof scheduleSchema>;
export type ScheduleDocument = {
  client: string;
  planVersion: number;
  planStatus: string;
  sourceUpdatedAt: string;
  generatedAt: string;
  request: ScheduleRequest;
  content: ContentSchedule;
};
export function endDate(startDate: string, days: number) {
  const value = new Date(`${startDate}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days - 1);
  return value.toISOString().slice(0, 10);
}
export function validateSchedule(raw: unknown, request: ScheduleRequest): ContentSchedule {
  const schedule = scheduleSchema.parse(raw);
  if (schedule.conteudos.length !== request.count)
    throw new Error("Quantidade de conteúdos incompleta.");
  for (const item of schedule.conteudos) {
    if (!request.channels.includes(item.canal) || !request.formats.includes(item.formato))
      throw new Error("A IA usou um canal ou formato fora da seleção.");
    if (item.data < request.startDate || item.data > endDate(request.startDate, request.days))
      throw new Error("A IA retornou datas fora do período.");
    if (item.formato === "video" && item.cenas.length < 2)
      throw new Error("Roteiro de vídeo incompleto.");
    if (item.formato === "estatico" && !item.texto_arte.trim())
      throw new Error("Texto do post estático ausente.");
    if (item.formato === "carrossel" && item.cards.length < 3)
      throw new Error("Carrossel precisa de pelo menos três cards completos.");
  }
  if (request.formats.some((format) => !schedule.conteudos.some((item) => item.formato === format)))
    throw new Error("Um formato selecionado não foi contemplado.");
  return {
    ...schedule,
    conteudos: [...schedule.conteudos].sort((a, b) => a.data.localeCompare(b.data)),
  };
}
