import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateMarketingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ diagnosticId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { generatePlan } = await import("./marketing-plan.server");
    return generatePlan(context.supabase, data.diagnosticId);
  });
