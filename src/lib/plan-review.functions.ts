import { reviewPlanContent } from "./plan-quality";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { marketingPlanSchema } from "./marketing-plan-schema";
import { governanceSchema } from "./planning-policy";
import type { Json } from "@/integrations/supabase/types";
export const reviewMarketingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) =>
    z
      .object({
        planId: z.string().uuid(),
        revision: z.string(),
        content: marketingPlanSchema,
        approve: z.boolean(),
        newVersion: z.boolean().default(false),
      })
      .parse(x),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: plan, error } = await db
      .from("marketing_plans")
      .select("*")
      .eq("id", data.planId)
      .single();
    if (error) throw error;
    if (plan.updated_at !== data.revision)
      throw new Error("O plano mudou. Recarregue antes de continuar.");
    if (plan.status === "aprovado" && !data.newVersion)
      throw new Error("Preserve o aprovado criando uma nova versão.");
    const { planningContext } = await import("./client-scope.server");
    const current = await planningContext(db, plan.client_id);
    const g = governanceSchema.parse(data.content.governanca ?? {});
    const original = governanceSchema.parse(
      (plan.content as Record<string, unknown>)?.["governanca"] ?? {},
    );
    const { diagnosticSources } = await import("./plan-sources.server");
    const businessSources = plan.diagnostic_id
      ? await diagnosticSources(db, plan.diagnostic_id, plan.client_id)
      : [];
    g.sources = original.sources; // Human edits cannot promote model prose into verified company facts.
    g.changeLog = original.changeLog;
    const updatedSources = [...businessSources, ...current.sources];
    const changedIds = new Set(
      [...original.sources, ...updatedSources]
        .filter(
          (s) =>
            JSON.stringify(original.sources.find((o) => o.id === s.id)) !==
            JSON.stringify(updatedSources.find((o) => o.id === s.id)),
        )
        .map((s) => s.id),
    );
    if (
      (original.sourceFingerprint && original.sourceFingerprint !== current.fingerprint) ||
      changedIds.size
    ) {
      const changeId = `change-${current.fingerprint.slice(0, 12)}`;
      if (!g.issues.some((i) => i.id === changeId))
        g.issues.push({
          id: changeId,
          category: "mudanca_de_fontes",
          priority: "impede_decisao",
          question:
            "Fontes alteradas: revisar as ações e indicadores afetados e registrar a decisão. Texto anterior preservado.",
          sourceIds: [...changedIds],
          actionIds: g.actions
            .filter(
              (a) =>
                a.evidenceIds.some((id) => changedIds.has(id)) ||
                (original.scopeId !== current.scope?.id && a.scopeItemId),
            )
            .map((a) => a.actionId),
          resolution: "",
        });
    }
    g.changeLog.push(
      `Revisão ${new Date().toISOString()} por ${context.userId}; conteúdo preservado; escopo ${current.scope?.version ?? "ausente"}.`,
    );
    g.sources = updatedSources;
    g.sourceFingerprint = current.fingerprint;
    data.content.governanca = g;
    const reviewed = reviewPlanContent(data.content, current.scope).governanca!;
    if (
      data.approve &&
      (reviewed.checks.some((c) => c.severity === "bloqueio") ||
        !reviewed.actions.length ||
        data.content.acoes.some((a) => !reviewed.actions.some((r) => r.title === a.titulo)))
    )
      throw new Error(
        "Resolva as pendências materiais e vincule todas as ações a fundamentos, condições e indicadores antes da aprovação.",
      );
    if (data.newVersion) {
      const { data: next, error } = await db
        .from("marketing_plans")
        .insert({
          client_id: plan.client_id,
          diagnostic_id: plan.diagnostic_id,
          content: data.content as unknown as Json,
          ai_warning:
            "Revalidação em nova versão. Confira impactos e pendências; aprovação anterior preservada.",
        })
        .select("id,updated_at")
        .single();
      if (error) throw error;
      return next;
    }
    const { data: next, error: saveError } = await db
      .from("marketing_plans")
      .update({
        content: data.content as unknown as Json,
        ...(data.approve ? { status: "aprovado" } : {}),
      })
      .eq("id", plan.id)
      .eq("updated_at", data.revision)
      .select("id,updated_at")
      .single();
    if (saveError) throw saveError;
    return next;
  });
