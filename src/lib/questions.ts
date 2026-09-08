export type AnswerValue = string | number | boolean | string[] | null;
export type AnswerMap = Record<string, AnswerValue>;

export type Pillar = "produto" | "preco" | "praca" | "promocao" | "performance";

export type QuestionType =
  "text" | "textarea" | "number" | "currency" | "select" | "radio" | "multi";

export interface Question {
  key: string;
  label: string;
  help?: string;
  type: QuestionType;
  options?: string[];
  group?: string;
  /** Mostra a pergunta apenas quando outra resposta bate com o valor esperado. */
  showIf?: { key: string; includes?: string; equals?: string };
}

export interface Step {
  id: string;
  pillar: Pillar | null;
  title: string;
  description: string;
  questions: Question[];
}

const t = (key: string, label: string, group?: string, help?: string): Question => ({
  key,
  label,
  type: "textarea",
  ...(group ? { group } : {}),
  ...(help ? { help } : {}),
});

export const STEPS: Step[] = [
  {
    id: "geral",
    pillar: null,
    title: "Informações gerais",
    description: "Antes de falar de marketing, queremos entender o momento atual da sua empresa.",
    questions: [
      { key: "geral.empresa", label: "Nome da empresa", type: "text" },
      { key: "geral.responsavel", label: "Quem está respondendo?", type: "text" },
      { key: "geral.cargo", label: "Qual o seu cargo?", type: "text" },
      { key: "geral.tempo", label: "Há quanto tempo a empresa existe?", type: "text" },
      { key: "geral.equipe", label: "Quantas pessoas trabalham na empresa?", type: "number" },
      t("geral.momento", "Como você descreveria o momento atual da empresa?"),
      t("geral.desafio", "Qual é o maior desafio da empresa hoje?"),
    ],
  },
  {
    id: "produto",
    pillar: "produto",
    title: "1. Produto",
    description:
      "Queremos entender o que sua empresa vende, para quem vende e por que alguém deveria escolher sua empresa.",
    questions: [
      t("produto.principais", "Quais são os principais produtos ou serviços da empresa?", "Oferta"),
      t(
        "produto.mais_importante",
        "Qual produto ou serviço é mais importante para o negócio atualmente?",
        "Oferta",
      ),
      t("produto.maior_margem", "Qual produto ou serviço possui maior margem?", "Oferta"),
      t(
        "produto.gostariam_vender",
        "Qual produto ou serviço vocês mais gostariam de vender?",
        "Oferta",
      ),

      t("produto.quem_compra", "Quem normalmente compra de vocês?", "Cliente"),
      t("produto.quem_gostariam", "Quem vocês gostariam que comprasse mais?", "Cliente"),
      t("produto.problema_cliente", "Qual problema leva esse cliente até vocês?", "Cliente"),
      t(
        "produto.procura_antes",
        "O que esse cliente normalmente procura antes de comprar?",
        "Cliente",
      ),

      t("produto.por_que_escolhem", "Por que um cliente escolhe vocês?", "Diferencial"),
      t("produto.melhor_que", "O que vocês fazem melhor que os concorrentes?", "Diferencial"),
      t(
        "produto.concorrentes_nao_fazem",
        "O que vocês fazem que os concorrentes não fazem?",
        "Diferencial",
      ),
      t(
        "produto.desconhecido",
        "Existe alguma característica importante da empresa que o mercado ainda não conhece?",
        "Diferencial",
      ),

      t("produto.pos_compra", "O que acontece depois que o cliente compra?", "Experiência"),
      {
        key: "produto.recompra",
        label: "Existe recompra?",
        type: "radio",
        options: ["Sim, frequente", "Sim, eventual", "Raramente", "Não"],
        group: "Experiência",
      },
      {
        key: "produto.indicacao",
        label: "Existe indicação?",
        type: "radio",
        options: ["Sim, é nossa principal fonte", "Sim, acontece bastante", "Pouco", "Não"],
        group: "Experiência",
      },
      t("produto.reclamacoes", "Quais são as principais reclamações dos clientes?", "Experiência"),
      t("produto.elogios", "O que os clientes mais elogiam?", "Experiência"),
    ],
  },
  {
    id: "preco",
    pillar: "preco",
    title: "2. Preço",
    description:
      "Queremos entender como o preço funciona dentro do posicionamento e da estratégia da empresa.",
    questions: [
      {
        key: "preco.medio",
        label: "Qual é o preço médio dos principais produtos ou serviços?",
        type: "currency",
      },
      {
        key: "preco.faixas",
        label: "Existem diferentes faixas de preço?",
        type: "radio",
        options: ["Sim", "Não"],
      },
      t("preco.faixas_quais", "Quais são essas faixas?", undefined),
      t("preco.definicao", "Como vocês definem os preços?"),
      {
        key: "preco.vantagem",
        label: "O preço é uma vantagem ou desvantagem competitiva?",
        type: "radio",
        options: ["Vantagem", "Neutro", "Desvantagem"],
      },
      t("preco.concorrentes", "Quem são os principais concorrentes?"),
      t("preco.concorrentes_valores", "Quanto os principais concorrentes cobram aproximadamente?"),
      {
        key: "preco.descontos",
        label: "Vocês costumam oferecer descontos?",
        type: "radio",
        options: ["Sempre", "Às vezes", "Raramente", "Nunca"],
      },
      {
        key: "preco.acha_caro",
        label: "O cliente costuma considerar o preço caro?",
        type: "radio",
        options: ["Sim, com frequência", "Às vezes", "Raramente", "Não"],
      },
      {
        key: "preco.compara",
        label: "O cliente costuma comparar preço antes de comprar?",
        type: "radio",
        options: ["Sim, sempre", "Às vezes", "Raramente", "Não"],
      },
      { key: "preco.ticket", label: "Qual é o ticket médio?", type: "currency" },
      {
        key: "preco.margem",
        label: "Qual é a margem aproximada (%) dos principais produtos ou serviços?",
        type: "number",
      },
    ],
  },
  {
    id: "praca",
    pillar: "praca",
    title: "3. Praça",
    description: "Queremos entender onde a empresa atua e como o cliente chega até a compra.",
    questions: [
      t("praca.onde_atende", "Onde vocês atendem?", "Localização"),
      t("praca.regiao_importante", "Qual região é mais importante para o negócio?", "Localização"),
      t("praca.regiao_evitar", "Existem regiões que vocês não querem atender?", "Localização"),
      t(
        "praca.limite_distancia",
        "Existe limite de distância para atendimento ou entrega?",
        "Localização",
      ),

      {
        key: "praca.canais",
        label: "Onde acontece a venda?",
        type: "multi",
        options: [
          "Loja física",
          "WhatsApp",
          "Instagram",
          "Site",
          "Google",
          "Marketplace",
          "Vendedores",
          "Telefone",
          "Outro",
        ],
        group: "Canais",
      },
      t("praca.canais_outro", "Qual outro canal de venda?", "Canais"),

      t(
        "praca.jornada",
        "Como uma pessoa que conhece a empresa pela primeira vez realiza uma compra?",
        "Processo",
      ),
      t(
        "praca.tempo_venda",
        "Quanto tempo normalmente leva do primeiro contato até a venda?",
        "Processo",
      ),
      t("praca.quem_atende", "Quem realiza o atendimento?", "Processo"),
      t("praca.distribuicao_leads", "Como os leads são distribuídos?", "Processo"),
      t(
        "praca.problema_atendimento",
        "Existe algum problema frequente no atendimento?",
        "Processo",
      ),

      {
        key: "praca.capacidade",
        label: "A empresa possui capacidade para atender mais clientes atualmente?",
        type: "radio",
        options: ["Sim, com folga", "Sim, um pouco", "Estamos no limite", "Não"],
        group: "Capacidade",
      },
      t("praca.picos", "Existem horários ou dias de maior demanda?", "Capacidade"),
      t("praca.limite_producao", "Existe algum limite de produção?", "Capacidade"),
      {
        key: "praca.dobro",
        label: "Se a empresa recebesse o dobro de clientes amanhã, conseguiria atender?",
        type: "radio",
        options: ["Sim", "Parcialmente", "Não"],
        group: "Capacidade",
      },
    ],
  },
  {
    id: "promocao",
    pillar: "promocao",
    title: "4. Promoção",
    description:
      "Queremos entender como sua empresa se comunica, atrai atenção e transforma interesse em vendas.",
    questions: [
      t(
        "promocao.posicionamento",
        "Como vocês definiriam o posicionamento atual da empresa?",
        "Comunicação",
      ),
      t(
        "promocao.percepcao",
        "O que vocês querem que as pessoas pensem quando lembram da marca?",
        "Comunicação",
      ),
      t("promocao.mensagem", "Qual mensagem vocês mais querem comunicar?", "Comunicação"),
      t(
        "promocao.nao_entende",
        "O que vocês acham que o público ainda não entende sobre a empresa?",
        "Comunicação",
      ),

      {
        key: "promocao.canais",
        label: "Quais canais de marketing vocês utilizam atualmente?",
        type: "multi",
        options: [
          "Instagram",
          "Facebook",
          "TikTok",
          "YouTube",
          "Google Ads",
          "WhatsApp",
          "E-mail",
          "Eventos",
          "Indicação",
          "Nenhum",
          "Outros",
        ],
        group: "Canais",
      },
      {
        key: "promocao.google_investimento",
        label: "Quanto investem em Google Ads por mês?",
        type: "currency",
        group: "Canais",
        showIf: { key: "promocao.canais", includes: "Google Ads" },
      },
      {
        key: "promocao.google_objetivo",
        label: "Qual o objetivo das campanhas no Google?",
        type: "textarea",
        group: "Canais",
        showIf: { key: "promocao.canais", includes: "Google Ads" },
      },
      {
        key: "promocao.google_leads",
        label: "Quantos leads o Google gera por mês?",
        type: "number",
        group: "Canais",
        showIf: { key: "promocao.canais", includes: "Google Ads" },
      },
      {
        key: "promocao.google_resultado",
        label: "Qual o resultado médio dessas campanhas?",
        type: "textarea",
        group: "Canais",
        showIf: { key: "promocao.canais", includes: "Google Ads" },
      },
      {
        key: "promocao.sem_google",
        label: "Por que ainda não utilizam Google Ads?",
        type: "textarea",
        group: "Canais",
      },

      {
        key: "promocao.ja_anunciou",
        label: "Já fizeram anúncios?",
        type: "radio",
        options: ["Sim", "Não"],
        group: "Histórico",
      },
      {
        key: "promocao.investimento_passado",
        label: "Quanto investiram aproximadamente?",
        type: "currency",
        group: "Histórico",
      },
      t("promocao.funcionou", "O que funcionou?", "Histórico"),
      t("promocao.nao_funcionou", "O que não funcionou?", "Histórico"),
      {
        key: "promocao.outra_agencia",
        label: "Já trabalharam com outra agência ou profissional?",
        type: "radio",
        options: ["Sim", "Não"],
        group: "Histórico",
      },
      t("promocao.por_que_encerraram", "Por que encerraram?", "Histórico"),

      t(
        "promocao.concorrentes_bons",
        "Quais concorrentes vocês consideram bons em marketing?",
        "Concorrência",
      ),
      t(
        "promocao.marca_admirada",
        "Existe alguma marca que vocês admiram e gostariam de se aproximar em posicionamento?",
        "Concorrência",
      ),

      t("promocao.origem_clientes", "De onde vêm os clientes atualmente?", "Resultados atuais"),
      {
        key: "promocao.investimento_mes",
        label: "Quanto investem em marketing por mês?",
        type: "currency",
        group: "Resultados atuais",
      },
      {
        key: "promocao.leads_mes",
        label: "Quantos leads recebem aproximadamente por mês?",
        type: "number",
        group: "Resultados atuais",
      },
      {
        key: "promocao.leads_convertidos",
        label: "Quantos leads se transformam em clientes por mês?",
        type: "number",
        group: "Resultados atuais",
      },
      {
        key: "promocao.cac",
        label: "Vocês acompanham CAC (custo de aquisição de cliente)?",
        type: "radio",
        options: ["Sim", "Mais ou menos", "Não"],
        group: "Resultados atuais",
      },
      {
        key: "promocao.roi",
        label: "Vocês acompanham ROI ou ROAS?",
        type: "radio",
        options: ["Sim", "Mais ou menos", "Não"],
        group: "Resultados atuais",
      },
    ],
  },
  {
    id: "performance",
    pillar: "performance",
    title: "5. Performance",
    description:
      "Agora queremos transformar os objetivos da empresa em números que possam ser acompanhados.",
    questions: [
      t("performance.objetivo_3m", "Qual é o principal objetivo da empresa nos próximos 3 meses?"),
      t("performance.objetivo_12m", "Qual é o principal objetivo nos próximos 12 meses?"),
      {
        key: "performance.faturamento_atual",
        label: "Quanto a empresa fatura aproximadamente por mês?",
        type: "currency",
      },
      {
        key: "performance.faturamento_meta",
        label: "Qual faturamento vocês gostariam de alcançar por mês?",
        type: "currency",
      },
      {
        key: "performance.novos_clientes",
        label: "Quantos novos clientes vocês precisam conquistar por mês?",
        type: "number",
      },
      {
        key: "performance.investimento",
        label: "Quanto estão dispostos a investir em marketing por mês?",
        type: "currency",
      },
      t("performance.excelente", "Qual seria um resultado considerado excelente?"),
      t("performance.minimo", "Qual seria o resultado mínimo aceitável?"),
      {
        key: "performance.meta_vendas",
        label: "Existe alguma meta específica de vendas? Qual?",
        type: "text",
      },
      {
        key: "performance.meta_leads",
        label: "Existe alguma meta específica de leads? Qual?",
        type: "number",
      },
      {
        key: "performance.meta_faturamento",
        label: "Existe alguma meta específica de faturamento? Qual?",
        type: "currency",
      },
    ],
  },
  {
    id: "final",
    pillar: null,
    title: "Observações finais",
    description: "Algo que ainda não perguntamos e você acha importante que a Syna saiba.",
    questions: [
      t("final.observacoes", "Observações finais"),
      t("final.expectativa", "O que você espera de uma parceria com a Syna?"),
    ],
  },
];

export const ALL_QUESTIONS: Question[] = STEPS.flatMap((s) => s.questions);

export function questionByKey(key: string): Question | undefined {
  return ALL_QUESTIONS.find((q) => q.key === key);
}

export function pillarOfKey(key: string): Pillar | null {
  const step = STEPS.find((s) => s.questions.some((q) => q.key === key));
  return step?.pillar ?? null;
}

export function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  // Regras condicionais explícitas
  if (q.showIf) {
    const v = answers[q.showIf.key];
    if (q.showIf.includes) {
      return Array.isArray(v) && v.includes(q.showIf.includes);
    }
    if (q.showIf.equals) return v === q.showIf.equals;
  }
  // Regras condicionais derivadas
  switch (q.key) {
    case "preco.faixas_quais":
      return answers["preco.faixas"] === "Sim";
    case "praca.canais_outro":
      return (
        Array.isArray(answers["praca.canais"]) &&
        (answers["praca.canais"] as string[]).includes("Outro")
      );
    case "promocao.sem_google":
      return (
        Array.isArray(answers["promocao.canais"]) &&
        !(answers["promocao.canais"] as string[]).includes("Google Ads")
      );
    case "promocao.investimento_passado":
    case "promocao.funcionou":
    case "promocao.nao_funcionou":
      return answers["promocao.ja_anunciou"] === "Sim";
    case "promocao.por_que_encerraram":
      return answers["promocao.outra_agencia"] === "Sim";
    default:
      return true;
  }
}

/** Perguntas obrigatórias para enviar o diagnóstico. */
export const REQUIRED_KEYS = new Set<string>([
  "geral.empresa",
  "geral.responsavel",
  "geral.momento",
  "geral.desafio",
  "preco.medio",
  "performance.faturamento_atual",
  "performance.faturamento_meta",
  "performance.investimento",
]);

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Retorna as perguntas obrigatórias visíveis ainda sem resposta na etapa. */
export function missingRequired(step: Step, answers: AnswerMap): Question[] {
  return step.questions.filter(
    (q) => REQUIRED_KEYS.has(q.key) && isVisible(q, answers) && !isAnswered(answers[q.key]),
  );
}

/** Todas as pendências obrigatórias do formulário inteiro. */
export function allMissingRequired(answers: AnswerMap): Question[] {
  return STEPS.flatMap((s) => missingRequired(s, answers));
}
