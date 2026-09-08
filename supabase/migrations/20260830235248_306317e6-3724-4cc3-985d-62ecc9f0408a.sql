-- enums
CREATE TYPE public.app_role AS ENUM ('admin','equipe');
CREATE TYPE public.client_status AS ENUM ('lead','diagnostico_pendente','diagnostico_em_analise','cliente_ativo','pausado','encerrado');
CREATE TYPE public.diagnostic_status AS ENUM ('pendente','em_preenchimento','respondido','em_analise','validado');
CREATE TYPE public.pillar AS ENUM ('produto','preco','praca','promocao','performance');
CREATE TYPE public.priority AS ENUM ('alta','media','baixa');
CREATE TYPE public.action_status AS ENUM ('backlog','planejado','em_andamento','concluido');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by team" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles readable by team" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles) = 0 THEN 'admin'::public.app_role ELSE 'equipe'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  trade_name text,
  segment text,
  category text,
  cnpj text,
  city text,
  state text,
  website text,
  instagram text,
  whatsapp text,
  contact_name text,
  contact_role text,
  email text,
  phone text,
  start_date date,
  status public.client_status NOT NULL DEFAULT 'lead',
  notes text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "team insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team update clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title text,
  status public.diagnostic_status NOT NULL DEFAULT 'pendente',
  current_step int NOT NULL DEFAULT 0,
  overall_score numeric(4,2),
  executive_summary text,
  main_bottleneck public.pillar,
  main_opportunity text,
  submitted_at timestamptz,
  analyzed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostics TO authenticated;
GRANT ALL ON public.diagnostics TO service_role;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read diagnostics" ON public.diagnostics FOR SELECT TO authenticated USING (true);
CREATE POLICY "team insert diagnostics" ON public.diagnostics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team update diagnostics" ON public.diagnostics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete diagnostics" ON public.diagnostics FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER diagnostics_touch BEFORE UPDATE ON public.diagnostics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  pillar public.pillar,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (diagnostic_id, question_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read answers" ON public.answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "team write answers" ON public.answers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pillar_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  pillar public.pillar NOT NULL,
  auto_score numeric(4,2),
  final_score numeric(4,2),
  change_reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz,
  summary text,
  strengths text[] NOT NULL DEFAULT '{}',
  problems text[] NOT NULL DEFAULT '{}',
  risks text[] NOT NULL DEFAULT '{}',
  opportunities text[] NOT NULL DEFAULT '{}',
  notes text,
  priority public.priority NOT NULL DEFAULT 'media',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (diagnostic_id, pillar)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pillar_scores TO authenticated;
GRANT ALL ON public.pillar_scores TO service_role;
ALTER TABLE public.pillar_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read scores" ON public.pillar_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "team write scores" ON public.pillar_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER scores_touch BEFORE UPDATE ON public.pillar_scores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  diagnostic_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  title text NOT NULL,
  pillar public.pillar,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  priority public.priority NOT NULL DEFAULT 'media',
  due_date date,
  status public.action_status NOT NULL DEFAULT 'backlog',
  expected_result text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read actions" ON public.action_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "team write actions" ON public.action_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER actions_touch BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  period_date date NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_key, period_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metric_values TO authenticated;
GRANT ALL ON public.metric_values TO service_role;
ALTER TABLE public.metric_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read metrics" ON public.metric_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "team write metrics" ON public.metric_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  target_value numeric NOT NULL,
  period_start date,
  period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read goals" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "team write goals" ON public.goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER goals_touch BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_diag_client ON public.diagnostics(client_id);
CREATE INDEX idx_answers_diag ON public.answers(diagnostic_id);
CREATE INDEX idx_scores_diag ON public.pillar_scores(diagnostic_id);
CREATE INDEX idx_actions_client ON public.action_items(client_id);
CREATE INDEX idx_metrics_client ON public.metric_values(client_id, period_date);