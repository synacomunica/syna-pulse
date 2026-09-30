import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { workflowSchema, validateWorkflow, validateRevision } from "./editorial-workflow";
import type { Json } from "@/integrations/supabase/types";

export const saveEditorialCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        updatedAt: z.string().optional(),
        planId: z.string().uuid(),
        sourceUpdatedAt: z.string(),
        content: workflowSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: roles, error: roleError } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw roleError;
    if (!roles?.some((r) => r.role === "admin"))
      throw new Error("Somente administradores podem editar o cronograma.");
    const content = validateWorkflow(data.content);
    const { data: plan, error } = await db
      .from("marketing_plans")
      .select("*")
      .eq("id", data.planId)
      .single();
    if (error) throw error;
    if (!data.id && plan.updated_at !== data.sourceUpdatedAt)
      throw new Error("O plano mudou. Recarregue antes de criar o ciclo.");
    const previous = data.id
      ? await db
          .from("editorial_cycles")
          .select("content,source_updated_at")
          .eq("id", data.id)
          .eq("plan_id", plan.id)
          .single()
      : null;
    if (previous?.error) throw previous.error;
    if (
      previous &&
      previous.data.source_updated_at !== data.sourceUpdatedAt &&
      (data.sourceUpdatedAt !== plan.updated_at || content.topics.some((t) => t.status !== "banco"))
    )
      throw new Error(
        "Para atualizar a referência, devolva todas as pautas ao banco e revise o plano atual.",
      );
    validateRevision(
      previous ? workflowSchema.parse(previous.data.content) : null,
      content,
      plan.status === "aprovado",
    );
    const { planningContext } = await import("./client-scope.server");
    const { checkScheduleScope } = await import("./schedule-scope");
    const planning = await planningContext(db, plan.client_id);
    const scheduled = content.topics.filter(
      (t) => t.status !== "banco" && t.publication && t.format && t.channel,
    );
    const warnings = checkScheduleScope(
      scheduled.map((t) => ({
        data: t.publication,
        canal: t.channel,
        formato: t.format,
        scopeItemId: t.scopeItemId,
      })),
      planning.scope,
      undefined,
      false,
    );
    // Existing publication history must remain editable for measurement even after deadlines pass.
    const values = { content: content as unknown as Json, source_updated_at: data.sourceUpdatedAt };
    const result = data.id
      ? await db
          .from("editorial_cycles")
          .update(values)
          .eq("id", data.id)
          .eq("plan_id", data.planId)
          .eq("updated_at", data.updatedAt ?? "")
          .select("*")
          .maybeSingle()
      : await db
          .from("editorial_cycles")
          .insert({
            ...values,
            client_id: plan.client_id,
            plan_id: plan.id,
            source_updated_at: data.sourceUpdatedAt,
            month: content.month,
          })
          .select("*")
          .single();
    if (result.error)
      throw new Error(
        result.error.code === "23505"
          ? "Já existe um ciclo para este cliente e mês. Abra o ciclo salvo."
          : result.error.message,
      );
    if (!result.data)
      throw new Error("O ciclo foi alterado em outra sessão. Recarregue antes de salvar.");
    return { cycle: result.data, warnings };
  });

export const editorialContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ planId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: plan, error } = await db
      .from("marketing_plans")
      .select("*")
      .eq("id", data.planId)
      .single();
    if (error) throw error;
    const { planningContext } = await import("./client-scope.server");
    const { diagnosticSources } = await import("./plan-sources.server");
    const [planning, sources, diagnostic] = await Promise.all([
      planningContext(db, plan.client_id),
      plan.diagnostic_id
        ? diagnosticSources(db, plan.diagnostic_id, plan.client_id)
        : Promise.resolve([]),
      plan.diagnostic_id
        ? db
            .from("diagnostics")
            .select("executive_summary,main_bottleneck,main_opportunity,status")
            .eq("id", plan.diagnostic_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (diagnostic.error) throw diagnostic.error;
    return {
      scope: planning.scope,
      sources: [...sources, ...planning.sources],
      diagnostic: diagnostic.data,
    };
  });
