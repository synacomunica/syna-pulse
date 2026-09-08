import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPublicDiagnostic = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { fetchByToken } = await import("./diagnostic.server");
    return fetchByToken(data.token);
  });

export const savePublicAnswers = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        step: z.number().int().min(0).max(20),
        answers: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveAnswers } = await import("./diagnostic.server");
    return saveAnswers(data.token, data.answers, data.step);
  });

export const submitPublicDiagnostic = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { submitDiagnostic } = await import("./diagnostic.server");
    return submitDiagnostic(data.token);
  });

export const analyzeDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ diagnosticId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { runAnalysis } = await import("./diagnostic.server");
    return runAnalysis(data.diagnosticId);
  });

export const getPublicReport = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { fetchReportByToken } = await import("./diagnostic.server");
    return fetchReportByToken(data.token);
  });
