/** Tipos e vocabulário compartilhado do módulo Plano de Marketing (client-safe). */

export const JOURNEY_STAGES = ["aware", "appeal", "ask", "act", "advocate"] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const STAGE_LABEL: Record<JourneyStage, string> = {
  aware: "Aware — Assimilação",
  appeal: "Appeal — Atração",
  ask: "Ask — Arguição",
  act: "Act — Ação",
  advocate: "Advocate — Apologia",
};

export const STAGE_SHORT: Record<JourneyStage, string> = {
  aware: "Aware",
  appeal: "Appeal",
  ask: "Ask",
  act: "Act",
  advocate: "Advocate",
};

export const STAGE_QUESTION: Record<JourneyStage, string> = {
  aware: "As pessoas certas sabem que essa marca existe?",
  appeal: "Quando conhecem a marca, as pessoas sentem interesse por ela?",
  ask: "Quando pesquisam sobre a empresa, encontram motivos para confiar?",
  act: "Quando decidem comprar, a empresa consegue converter?",
  advocate: "Depois da compra, o cliente volta, recomenda ou defende a marca?",
};

export const ACTION_CATEGORIES = [
  "Posicionamento",
  "Branding",
  "Conteúdo",
  "Audiovisual",
  "Social Media",
  "Meta Ads",
  "Google Ads",
  "SEO",
  "Google Business",
  "Influenciadores",
  "Creators",
  "Site",
  "Landing Page",
  "WhatsApp",
  "CRM",
  "Comercial",
  "Atendimento",
  "Oferta",
  "Produto",
  "Preço",
  "Pesquisa",
  "Experiência",
  "Fidelização",
  "Indicação",
  "Pós-venda",
] as const;

export const PLAN_STATUS_LABEL: Record<string, string> = {
  rascunho_ia: "Rascunho IA",
  aprovado: "Plano aprovado",
};

export interface PlanObjective {
  descricao: string;
  problema: string;
  pilar: string;
  etapa: string;
  kpi: string;
  valor_atual: number | null;
  meta: number | null;
  prazo: string;
}

export interface PlanAction {
  titulo: string;
  descricao: string;
  categoria: string;
  objetivo: string;
  estrategia: string;
  pilar: string;
  etapa: string;
  responsavel: string;
  prazo: string;
  kpi: string;
  meta: string;
  impacto: "alto" | "medio" | "baixo" | string;
  urgencia: "alta" | "media" | "baixa" | string;
  esforco: "alto" | "medio" | "baixo" | string;
  prioridade: "critica" | "alta" | "media" | "baixa" | string;
  fase: string;
}

export interface PlanLearning {
  hipotese: string;
  acao: string;
  resultado: string;
  aprendizado: string;
  decisao: string;
}

export interface MarketingPlanContent {
  resumo_estrategico: string;
  notas_4p: { pilar: string; nota: number | null }[];
  canais: {
    canal: string;
    objetivo: string;
    estrategia: string;
    etapa: string;
    justificativa: string;
  }[];
  conteudo_comunicacao: { mensagem_central: string; temas: string[]; provas: string[] };
  aquisicao: string;
  conversao: string;
  retencao_advocacia: string;
  publico_estrategico: string;
  diagnostico_partida: {
    gargalo_pilar: string;
    subdimensao: string;
    problema: string;
    causa: string;
    oportunidade: string;
    evidencias: string[];
  };
  subdimensoes: {
    pilar: string;
    nome: string;
    nota: number | null;
    problema: string;
    evidencia: string;
    oportunidade: string;
  }[];
  jornada_5a: {
    etapa: string;
    nota: number | null;
    diagnostico: string;
    problemas: string[];
    evidencias: string[];
  }[];
  gargalo_jornada: {
    etapa: string;
    diagnostico: string;
    evidencias: string[];
    causa_hipotese: string;
  };
  relacao_4p_5a: {
    pilar: string;
    subdimensao: string;
    etapa: string;
    problema: string;
    causa: string;
  };
  mudanca_comportamento: { estado_atual: string; estado_desejado: string };
  objetivo_principal: PlanObjective;
  objetivos_secundarios: PlanObjective[];
  estrategia_central: string;
  estrategias_5a: { etapa: string; estrategia: string; justificativa: string }[];
  quatro_cs: { de: string; para: string; oportunidades: string[] }[];
  acoes: PlanAction[];
  kpis: { etapa: string; nome: string; valor_atual: number | null; meta: number | null }[];
  cronograma: { periodo: string; foco: string; acoes: string[] }[];
  plano_90_dias: { fase: string; objetivo: string; acoes: string[] }[];
  funil: { etapa: string; valor: number | null }[];
  funil_contexto: { periodo: string; populacao: string; verificado: boolean };
  par_bar: { par: number | null; bar: number | null; observacao: string };
  riscos: string[];
  alertas: { titulo: string; motivo: string; recomendacao: string }[];
  dados_insuficientes: string[];
  aprendizados?: PlanLearning[];
}

export const PRIORITY_ORDER: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export function planPriorityClasses(p: string): string {
  switch (p) {
    case "critica":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "alta":
      return "bg-warning/15 text-warning border-warning/30";
    case "media":
      return "bg-good/12 text-good border-good/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
