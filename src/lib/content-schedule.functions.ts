import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scheduleRequestSchema } from "./content-schedule";

export const generateContentSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => scheduleRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { generateSchedule } = await import("./content-schedule.server");
    return generateSchedule(context.supabase, context.userId, data);
  });
