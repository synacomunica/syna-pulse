-- Additive: original plans and approved content are never rewritten.
CREATE OR REPLACE FUNCTION public.can_access_contract_client(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.clients WHERE id=cid AND (public.has_role(auth.uid(),'admin') OR owner_id=auth.uid() OR created_by=auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.can_access_contract_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_contract_client(uuid) TO authenticated;
CREATE TABLE public.client_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES public.clients(id),
 title text NOT NULL, kind text NOT NULL CHECK(kind IN ('contrato','aditivo','complemento')),
 version integer NOT NULL DEFAULT 1, replaces_id uuid REFERENCES public.client_documents(id),
 status text NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','vigente','encerrado','substituido')),
 valid_from date, valid_until date, storage_path text NOT NULL UNIQUE,
 processing_status text NOT NULL DEFAULT 'aguardando_conferencia' CHECK(processing_status IN ('processando','aguardando_conferencia','confirmado','falha')),
 extraction jsonb, processing_error text, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(valid_from IS NULL OR valid_until IS NULL OR valid_from<=valid_until)
);
CREATE TABLE public.client_scopes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES public.clients(id),
 version integer NOT NULL DEFAULT 1, status text NOT NULL CHECK(status IN ('provisorio','confirmado')),
 origin text NOT NULL CHECK(origin IN ('manual','contrato_conferido','extracao_provisoria')),
 document_ids uuid[] NOT NULL DEFAULT '{}', content jsonb NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id,version)
);
CREATE TABLE public.client_planning_inputs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL REFERENCES public.clients(id),
 kind text NOT NULL CHECK(kind IN ('resposta','decisao','briefing','evidencia')),
 subject text NOT NULL, value text NOT NULL, reference text NOT NULL DEFAULT '', supersedes_id uuid REFERENCES public.client_planning_inputs(id),
 created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.contract_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.can_access_contract_client(NEW.client_id) THEN RAISE EXCEPTION 'Cliente não autorizado'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.version IS DISTINCT FROM OLD.version OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Arquivo e origem imutáveis. Envie nova versão.'; END IF;
 ELSE
  PERFORM id FROM public.clients WHERE id=NEW.client_id FOR UPDATE;
  SELECT COALESCE(MAX(version),0)+1 INTO NEW.version FROM public.client_documents WHERE client_id=NEW.client_id;
  NEW.created_by:=auth.uid();
  IF NEW.storage_path NOT LIKE NEW.client_id::text||'/'||NEW.id::text||'/%' THEN RAISE EXCEPTION 'Caminho inválido'; END IF;
  IF NEW.replaces_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.client_documents WHERE id=NEW.replaces_id AND client_id=NEW.client_id) THEN RAISE EXCEPTION 'Origem de substituição inválida'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER document_guard BEFORE INSERT OR UPDATE ON public.client_documents FOR EACH ROW EXECUTE FUNCTION public.contract_version_guard();
CREATE OR REPLACE FUNCTION public.scope_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.can_access_contract_client(NEW.client_id) THEN RAISE EXCEPTION 'Cliente não autorizado'; END IF;
 PERFORM id FROM public.clients WHERE id=NEW.client_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM unnest(NEW.document_ids) doc WHERE NOT EXISTS(SELECT 1 FROM public.client_documents d WHERE d.id=doc AND d.client_id=NEW.client_id)) THEN RAISE EXCEPTION 'Documento de outro cliente'; END IF;
 SELECT COALESCE(MAX(version),0)+1 INTO NEW.version FROM public.client_scopes WHERE client_id=NEW.client_id;
 NEW.created_by:=auth.uid(); RETURN NEW;
END $$;
CREATE TRIGGER scope_guard BEFORE INSERT ON public.client_scopes FOR EACH ROW EXECUTE FUNCTION public.scope_version_guard();
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_planning_inputs ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.client_documents TO authenticated;
GRANT SELECT,INSERT ON public.client_scopes, public.client_planning_inputs TO authenticated;
CREATE POLICY documents_read ON public.client_documents FOR SELECT TO authenticated USING(public.can_access_contract_client(client_id));
CREATE POLICY documents_insert ON public.client_documents FOR INSERT TO authenticated WITH CHECK(public.can_access_contract_client(client_id) AND created_by=auth.uid());
CREATE POLICY documents_update ON public.client_documents FOR UPDATE TO authenticated USING(public.can_access_contract_client(client_id)) WITH CHECK(public.can_access_contract_client(client_id));
CREATE POLICY scopes_read ON public.client_scopes FOR SELECT TO authenticated USING(public.can_access_contract_client(client_id));
CREATE POLICY scopes_insert ON public.client_scopes FOR INSERT TO authenticated WITH CHECK(public.can_access_contract_client(client_id) AND created_by=auth.uid());
CREATE POLICY inputs_read ON public.client_planning_inputs FOR SELECT TO authenticated USING(public.can_access_contract_client(client_id));
CREATE POLICY inputs_insert ON public.client_planning_inputs FOR INSERT TO authenticated WITH CHECK(public.can_access_contract_client(client_id) AND created_by=auth.uid());
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('client-contracts','client-contracts',false,10485760,ARRAY['application/pdf']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY contract_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='client-contracts' AND EXISTS(SELECT 1 FROM public.client_documents d WHERE d.storage_path=name AND public.can_access_contract_client(d.client_id)));
CREATE POLICY contract_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='client-contracts' AND EXISTS(SELECT 1 FROM public.client_documents d WHERE d.storage_path=name AND public.can_access_contract_client(d.client_id)));
-- No update/delete policies: retained files and snapshots are immutable.
-- Defense in depth for writes outside the application UI.
CREATE OR REPLACE FUNCTION public.check_plan_governance() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE g jsonb; current_scope uuid;
BEGIN
 g:=NEW.content->'governanca';
 IF TG_OP='UPDATE' AND NEW.status='aprovado' AND OLD.status<>'aprovado' THEN
  IF g IS NULL OR COALESCE(g->>'instructionVersion','')='' THEN RAISE EXCEPTION 'Revalide este plano com as regras atuais antes de aprovar.'; END IF;
  IF COALESCE(g->>'state','')<>'pronto_revisao' THEN RAISE EXCEPTION 'Resolva as pendências materiais antes da aprovação.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(g->'checks','[]')) c WHERE c->>'severity'='bloqueio') THEN RAISE EXCEPTION 'Há verificações bloqueantes pendentes.'; END IF;
  SELECT id INTO current_scope FROM public.client_scopes WHERE client_id=NEW.client_id ORDER BY version DESC LIMIT 1;
  IF COALESCE(g->>'scopeId','')<>COALESCE(current_scope::text,'') THEN RAISE EXCEPTION 'Versão de escopo desatualizada.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.content->'acoes','[]')) a WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(g->'actions','[]')) b WHERE b->>'title'=a->>'titulo' AND jsonb_array_length(COALESCE(b->'evidenceIds','[]'))>0 AND COALESCE(b->>'completion','')<>'' AND COALESCE(b->>'metricId','')<>'')) THEN RAISE EXCEPTION 'Ação sem fundamento, conclusão ou avaliação.'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER plan_governance_guard BEFORE INSERT OR UPDATE ON public.marketing_plans FOR EACH ROW EXECUTE FUNCTION public.check_plan_governance();
-- Plans containing private scope references follow the same client access rule.
CREATE POLICY private_plan_sources_read ON public.marketing_plans AS RESTRICTIVE FOR SELECT TO authenticated USING(content->'governanca' IS NULL OR public.can_access_contract_client(client_id));
CREATE POLICY private_plan_sources_insert ON public.marketing_plans AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(content->'governanca' IS NULL OR public.can_access_contract_client(client_id));
CREATE POLICY private_plan_sources_update ON public.marketing_plans AS RESTRICTIVE FOR UPDATE TO authenticated USING(content->'governanca' IS NULL OR public.can_access_contract_client(client_id)) WITH CHECK(content->'governanca' IS NULL OR public.can_access_contract_client(client_id));
