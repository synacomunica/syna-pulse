import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { scenarioSchema } from "./marketing-scenario";
export const saveScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        clientId: z.string().uuid(),
        id: z.string().uuid().optional(),
        updatedAt: z.string().optional(),
        content: scenarioSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const roles = await db.from("user_roles").select("role").eq("user_id", context.userId);
    if (roles.error) throw roles.error;
    if (!roles.data.some((r) => r.role === "admin"))
      throw new Error("Somente administradores podem salvar cenários.");
    const content = data.content as unknown as Json;
    const result = data.id
      ? await db
          .from("marketing_scenarios")
          .update({ content })
          .eq("id", data.id)
          .eq("client_id", data.clientId)
          .eq("updated_at", data.updatedAt ?? "")
          .select("*")
          .maybeSingle()
      : await db
          .from("marketing_scenarios")
          .insert({ client_id: data.clientId, content })
          .select("*")
          .single();
    if (result.error) throw result.error;
    if (!result.data)
      throw new Error("O cenário mudou em outra sessão. Reabra a versão salva antes de editar.");
    return result.data;
  });
