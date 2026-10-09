CREATE TABLE public.marketing_scenarios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marketing_scenarios_client ON public.marketing_scenarios(client_id, created_at DESC);
ALTER TABLE public.marketing_scenarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.marketing_scenarios TO authenticated;
GRANT ALL ON public.marketing_scenarios TO service_role;
CREATE POLICY scenario_read ON public.marketing_scenarios FOR SELECT TO authenticated USING (
 public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id=client_id AND (c.owner_id=auth.uid() OR c.created_by=auth.uid()))
);
CREATE POLICY scenario_insert ON public.marketing_scenarios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY scenario_update ON public.marketing_scenarios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.touch_marketing_scenario() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN RAISE EXCEPTION 'Cliente do cenário é imutável.'; END IF;
 NEW.updated_at := clock_timestamp();
 RETURN NEW;
END $$;
CREATE TRIGGER scenario_touch BEFORE UPDATE ON public.marketing_scenarios FOR EACH ROW EXECUTE FUNCTION public.touch_marketing_scenario();
