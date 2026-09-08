# Acessos: gestão de usuários e recuperação de senha

Hoje só existe uma conta no sistema — a sua (oallansoueu@gmail.com) — e ela **já tem papel de Administrador**. A criação de novos usuários já funciona em Configurações > Equipe (nome, e-mail, papel, senha provisória gerada na hora).

O que falta para o fluxo ficar completo no dia a dia:

## 1. Recuperar senha na tela de login
- Link "Esqueci minha senha" na página de entrada.
- Informa o e-mail e recebe um link de redefinição.
- Nova página `/redefinir-senha` para digitar a nova senha e voltar ao login.

## 2. Troca de senha pelo próprio usuário
- Em Configurações > Seu acesso, campo para definir uma nova senha.
- Útil para quem entrou com a senha provisória criada pelo admin.

## 3. Ajustes de clareza na gestão de equipe
- Aviso explícito de que a senha provisória aparece uma única vez, com botão "Copiar".
- Mensagem indicando ao novo integrante que ele pode trocar a senha em Configurações.

## Detalhes técnicos
- Redefinição via `supabase.auth.resetPasswordForEmail` com `redirectTo` para a rota pública `/redefinir-senha`; a nova senha é aplicada com `supabase.auth.updateUser`.
- `/redefinir-senha` é rota pública (fora de `_authenticated`), pois o usuário chega sem sessão ativa até o link ser processado.
- Troca de senha logada usa `supabase.auth.updateUser({ password })` direto no cliente.
- Nenhuma mudança de banco de dados ou de políticas de acesso é necessária.
