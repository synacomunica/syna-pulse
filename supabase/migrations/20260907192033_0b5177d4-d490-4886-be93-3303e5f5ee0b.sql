CREATE TABLE public.marketing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  diagnostic_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho_ia',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_warning text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX marketing_plans_client_idx ON public.marketing_plans (client_id, version DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_plans TO authenticated;
GRANT ALL ON public.marketing_plans TO service_role;

ALTER TABLE public.marketing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver planos" ON public.marketing_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe pode criar planos" ON public.marketing_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe pode editar planos" ON public.marketing_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem excluir planos" ON public.marketing_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_marketing_plans_updated_at BEFORE UPDATE ON public.marketing_plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();