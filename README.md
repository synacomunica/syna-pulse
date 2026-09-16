# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Publicação na Vercel

O navegador usa `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública Publishable ou anon)
e `VITE_SUPABASE_URL`. Para a URL, o build também aceita `SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_URL`, nessa ordem de prioridade após `VITE_SUPABASE_URL`.
Assim, a URL criada pela integração do Supabase pode ser usada pelo frontend.
Somente a URL pública é exposta por essa compatibilidade; chaves administrativas
continuam exclusivas do servidor.

Configure as variáveis no ambiente Production e faça um novo deploy após salvar.
O arquivo `.env` local não é enviado ao GitHub nem à Vercel.

### Canais e cronograma editorial

Administradores podem usar **Gerenciar canais** no plano de marketing. Em uma
versão aprovada, o botão cria uma nova revisão em rascunho; a versão aprovada
permanece intacta. Preencha canal, objetivo e estratégia e salve o rascunho.

**Gerar cronograma de conteúdos** usa a versão salva, os canais selecionados,
o período (7 a 90 dias) e de 3 a 12 peças por geração. Usa a mesma
`GEMINI_API_KEY` (ou o provedor Lovable legado) do plano. O servidor verifica
perfil administrador e rejeita planos alterados durante a geração. O Word
inclui calendário, legendas, roteiros por cena, texto/direção de arte e cards.
Baixe o documento antes de sair: esta geração não cria histórico no banco.
Rascunhos são identificados como propostas a validar no documento.

Validação: `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint`
e `npm run build`. Para gerar um exemplo de QA com os três formatos:
`SCHEDULE_QA_DOCX=/tmp/cronograma.docx node --test tests/content-schedule.test.mjs`.

### Exportação de documentos

Planos de marketing e relatórios de diagnóstico oferecem DOCX editável (Word e importação no Google Docs) e PDF com texto selecionável. A exportação utiliza os registros salvos, preserva versão, situação e avisos da IA, e não executa uma nova geração de conteúdo. Salve alterações antes de exportar.

A apresentação adota a NBR 10719 para relatórios técnicos: A4, margens superior/esquerda de 3 cm e inferior/direita de 2 cm, corpo de 12 pontos, espaçamento simples, capa, resumo, sumário, seções hierárquicas, identificação das fontes e paginação visível a partir do texto. Gráficos usam somente notas disponíveis; ausência de dados não vira zero. Referência: https://www.ccsa.ufpb.br/propesq/contents/downloads/normas-abnt/abnt_nbr_10719.pdf

No Word, atualize o campo do sumário após abrir ou editar para preencher os números de página. Ao converter no Google Docs, atualize ou reinsira o sumário a partir dos títulos importados. O PDF já contém o sumário paginado. A paginação pode variar entre editores.

Validação: `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint` e `NITRO_PRESET=vercel npm run build`. Os testes de documentos verificam conteúdo, ausência de tokens privados, formatação DOCX e geração real de PDF.

### Planejamento fundamentado e contratos (regras 2026-09-16.1)

A geração (`marketing-plan.server.ts`), revisão/aprovação (`plan-review.functions.ts`) e cronogramas (`content-schedule.server.ts`) compartilham `planning-policy.ts`, catálogo de fontes e o escopo vigente. Não há gerador em segundo plano neste repositório. Planos anteriores permanecem legíveis; revalidação cria versão e nunca atualiza conteúdo aprovado. A revisão conserva o texto e identifica as referências/ações impactadas para decisão humana.

Em **Cliente → Contrato e escopo**, envie PDF de até 10 MB, marque a situação/vigência, confira cada item e confirme uma nova versão de escopo. Aditivos são incorporados explicitamente; cláusulas divergentes exigem resolução. Honorários, mídia, limites máximos e relações de contagem são campos independentes. Alterações no resumo são esclarecimentos, não alterações jurídicas do arquivo. Escopos manuais e extrações provisórias possuem origem distinta.

Arquivos são privados no bucket `client-contracts`; leitura/escrita exige administrador, responsável ou criador do cliente. A mesma restrição protege novos planos contendo referências contratuais. Arquivos e versões de escopo não têm permissão de sobrescrita/exclusão. A extração multimodal usa `GEMINI_API_KEY` no servidor e o PDF como dados, nunca como instruções. Trechos/páginas são sugestões da extração e exigem conferência humana, especialmente em digitalizações. Em falha há alternativa manual. Referência técnica: https://ai.google.dev/gemini-api/docs/generate-content/document-processing

Aplicar `supabase/migrations/20260916100000_contract_scope.sql` antes de publicar esta versão. A migração é aditiva, sem atualização de planos existentes. Em produção foi aplicada pelo SQL Editor do Lovable, com comparação de contagem e checksum dos planos antes/depois. O banco rejeita aprovação sem governança/revisão atual; aprovação nunca ocorre automaticamente.

Verificações por código: integridade das referências, pendências e estados, ordem/ciclos de dependências, datas, janelas de produção/aprovação, vigência, quantidades comparáveis, vídeos dentro do total, responsabilidade do cliente, escopo confirmado/substituído, contas de receita mensal de cenários, funil monotônico, capacidade e ciclo de venda. Campos ausentes permanecem desconhecidos. Texto sensível reconhecido por padrões recebe pendência; essa detecção não cobre toda linguagem natural.

Dependem da IA e da conferência humana: extração e correspondência semântica de trechos, relevância das evidências, conflitos em respostas livres, hipóteses causais, escolha de público/canais e adequação das mensagens. Não há navegação externa na geração: o sistema não afirma verificação jurídica ou de mercado atual. Períodos de contrato que não possam ser comparados com segurança exigem conferência; a checagem de calendário não consolida consumo de entregas em calendários históricos, que atualmente não são armazenados no sistema.

Testes: `node --test tests/*.test.mjs`. Incluem PostgreSQL local (PGlite) executando migração/RLS, testes de geração com provedor simulado, extração provisória/corrigível, falha de PDF, dependências, escopo e exportação. Testes com provedor simulado não medem a precisão real de OCR ou de decisões estratégicas.
