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
