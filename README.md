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
