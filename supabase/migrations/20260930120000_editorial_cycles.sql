CREATE TABLE public.editorial_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.marketing_plans(id),
  source_updated_at timestamptz NOT NULL,
  month text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, month)
);
ALTER TABLE public.editorial_cycles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.editorial_cycles TO authenticated;
GRANT ALL ON public.editorial_cycles TO service_role;
CREATE POLICY editorial_read ON public.editorial_cycles FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id=client_id AND (c.owner_id=auth.uid() OR c.created_by=auth.uid()))
);
CREATE POLICY editorial_insert ON public.editorial_cycles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY editorial_update ON public.editorial_cycles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.validate_editorial_cycle() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.marketing_plans WHERE id=NEW.plan_id AND client_id=NEW.client_id) THEN RAISE EXCEPTION 'Plano não pertence ao cliente.'; END IF;
  IF NEW.month IS DISTINCT FROM NEW.content->>'month' THEN RAISE EXCEPTION 'Mês inconsistente.'; END IF;
  IF TG_OP='UPDATE' AND (NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.month IS DISTINCT FROM OLD.month) THEN RAISE EXCEPTION 'Origem do ciclo é imutável.'; END IF;
  IF TG_OP='UPDATE' AND NEW.source_updated_at IS DISTINCT FROM OLD.source_updated_at AND (
    EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content->'topics') t WHERE t->>'status' <> 'banco') OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.content->'topics') t WHERE t->>'status' = 'publicado')
  ) THEN RAISE EXCEPTION 'Revise as pautas no banco antes de atualizar a referência; preserve publicações existentes.'; END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER editorial_validate BEFORE INSERT OR UPDATE ON public.editorial_cycles FOR EACH ROW EXECUTE FUNCTION public.validate_editorial_cycle();
