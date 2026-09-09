-- Serialize versions per client and preserve approved strategic history.
CREATE OR REPLACE FUNCTION public.enforce_marketing_plan_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM id FROM public.clients WHERE id = NEW.client_id FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM public.diagnostics d WHERE d.id = NEW.diagnostic_id AND d.client_id = NEW.client_id AND d.status = 'validado' AND d.submitted_at IS NOT NULL AND d.analyzed_at IS NOT NULL AND d.validated_at IS NOT NULL AND d.validated_by IS NOT NULL) THEN
      RAISE EXCEPTION 'O plano requer diagnóstico respondido, analisado e validado deste cliente.';
    END IF;
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version FROM public.marketing_plans WHERE client_id = NEW.client_id;
    NEW.status := 'rascunho_ia'; NEW.approved_at := NULL; NEW.approved_by := NULL;
  ELSE
    IF OLD.status = 'aprovado' THEN RAISE EXCEPTION 'Crie uma nova versão para alterar um plano aprovado.'; END IF;
    IF NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.diagnostic_id IS DISTINCT FROM OLD.diagnostic_id OR NEW.version IS DISTINCT FROM OLD.version THEN RAISE EXCEPTION 'Origem e versão são imutáveis.'; END IF;
    IF NEW.status NOT IN ('rascunho_ia', 'aprovado') THEN RAISE EXCEPTION 'Status inválido.'; END IF;
    IF NEW.status = 'aprovado' THEN
      IF NOT EXISTS (SELECT 1 FROM public.diagnostics WHERE id = NEW.diagnostic_id AND status = 'validado') THEN RAISE EXCEPTION 'Valide o diagnóstico antes de aprovar o plano.'; END IF;
      IF COALESCE(NEW.content->>'estrategia_central', '') = '' OR COALESCE(NEW.content->'objetivo_principal'->>'descricao', '') = '' THEN RAISE EXCEPTION 'Complete objetivo e estratégia antes de aprovar.'; END IF;
      NEW.approved_by := auth.uid(); NEW.approved_at := now();
    ELSE
      NEW.approved_at := NULL; NEW.approved_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER marketing_plan_lifecycle BEFORE INSERT OR UPDATE ON public.marketing_plans FOR EACH ROW EXECUTE FUNCTION public.enforce_marketing_plan_lifecycle();
