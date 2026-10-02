# CondoVia MVP-0

Fundação do CondoVia: autenticação Supabase, resolução de contextos autorizados, permissões RBAC/RLS e shell responsivo conforme o Brand Book e o Design System v1.0.

## Requisitos

- Node.js 20 ou superior
- pnpm
- Supabase CLI
- Docker para executar o Supabase local

## Executar localmente

```sh
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm db:reset
pnpm dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_APP_URL` com os valores do Supabase local ou do projeto de homologação. O navegador recebe somente a chave anon/publicável; a service role não é usada pela aplicação.

## Verificações

```sh
pnpm test
pnpm db:test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm db:test` executa os testes pgTAP em `supabase/tests/rls_isolation.sql`. Os fixtures de tenants e usuários ficam dentro da transação de teste e não criam credenciais fixas para produção.

## Migrations

1. `001_saas_core.sql` — clientes, administradoras, condomínios, planos e assinaturas.
2. `002_identity.sql` — pessoas, contas, memberships e vínculos.
3. `003_authorization.sql` — roles, permissions, assignments e overrides com validação de escopo.
4. `004_rls_helpers.sql` — funções de resolução de conta, acesso e permissão.
5. `005_rls_policies.sql` — RLS deny-by-default e políticas explícitas de leitura.
6. `006_seed_authorization.sql` — catálogo inicial versionado de roles e permissions.

## Homologação

Configure no Supabase Auth a URL pública da Vercel e permita o callback `/auth/callback?next=%2Freset-password`. Configure as três variáveis do `.env.example` na Vercel. O deploy deve ser ligado ao repositório GitHub do projeto depois que este diretório for publicado em um remoto.
