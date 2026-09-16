import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scopeSchema, validDate, scopeConflicts } from "./planning-policy";
import type { Json } from "@/integrations/supabase/types";
export const processContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) => z.object({ documentId: z.string().uuid() }).parse(x))
  .handler(async ({ data, context }) => {
    const { extractScope } = await import("./client-scope.server");
    return extractScope(context.supabase, data.documentId);
  });
export const confirmScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((x) =>
    z
      .object({
        clientId: z.string().uuid(),
        expectedScopeId: z.string(),
        documentIds: z.array(z.string().uuid()),
        content: scopeSchema,
        confirm: z.boolean(),
      })
      .parse(x),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { planningContext } = await import("./client-scope.server");
    const current = await planningContext(db, data.clientId);
    if ((current.scope?.id ?? "") !== data.expectedScopeId)
      throw new Error("O escopo mudou. Recarregue antes de conferir.");
    for (const date of [data.content.validFrom, data.content.validUntil].filter(Boolean))
      if (!validDate(date)) throw new Error("Vigência inválida.");
    if (
      data.content.validFrom &&
      data.content.validUntil &&
      data.content.validUntil < data.content.validFrom
    )
      throw new Error("Fim anterior ao início da vigência.");
    if (new Set(data.content.items.map((i) => i.id)).size !== data.content.items.length)
      throw new Error("Identificadores de itens repetidos.");
    for (const item of data.content.items) {
      if (
        item.origin === "contrato" &&
        (!data.documentIds.includes(item.documentId) ||
          !item.excerpt ||
          !item.page ||
          item.page < 1)
      )
        throw new Error(
          "Item de contrato precisa de documento, página e trecho; correções sem trecho devem ser esclarecimento.",
        );
      if (
        [
          item.quantity,
          item.amount,
          item.productionDays,
          item.approvalDays,
          item.revisionLimit,
        ].some((n) => n !== null && n < 0)
      )
        throw new Error("Valores e quantidades não podem ser negativos.");
    }
    const conflicts = scopeConflicts(data.content);
    if (data.confirm && conflicts.length) throw new Error(conflicts.join(" "));
    if (data.confirm && data.content.items.some((i) => !i.confirmed))
      throw new Error(
        "Confira cada item antes de confirmar a versão; ambiguidades podem permanecer explicitamente registradas.",
      );
    if (
      data.confirm &&
      data.documentIds.some((id) =>
        current.documents.some((d) => d.id === id && d.status !== "vigente"),
      )
    )
      throw new Error(
        "Marque como vigente cada documento aplicável antes de confirmar; documentos em rascunho, encerrados ou substituídos não comprovam escopo vigente.",
      );
    const { data: row, error } = await db
      .from("client_scopes")
      .insert({
        client_id: data.clientId,
        status: data.confirm ? "confirmado" : "provisorio",
        origin: data.documentIds.length
          ? data.confirm
            ? "contrato_conferido"
            : "extracao_provisoria"
          : "manual",
        document_ids: data.documentIds,
        content: data.content as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (data.confirm && data.documentIds.length) {
      const result = await db
        .from("client_documents")
        .update({ processing_status: "confirmado" })
        .in("id", data.documentIds)
        .eq("client_id", data.clientId);
      if (result.error) throw result.error;
    }
    return row;
  });
