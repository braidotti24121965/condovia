# Arquitetura técnica e segurança

## Stack

- Next.js 15.5.27, React e TypeScript.
- Supabase Auth, PostgreSQL, migrations SQL, RLS e funções/RPCs.
- Vercel para Preview e Production.
- pnpm, Vitest, Playwright e Docker/Supabase local para desenvolvimento controlado.

## Camadas

1. App Router e layouts protegidos.
2. Shell, contexto ativo e navegação.
3. Server Actions e consultas por contexto.
4. Supabase Auth e tabelas `public`.
5. RBAC, permissões granulares, RLS, triggers e auditoria.

## Isolamento

Toda leitura ou mutação operacional deve resolver o contexto autorizado e filtrar `condominium_id`. RLS permanece a última barreira. Consultas administrativas não devem ser copiadas para o frontend como atalho de autorização.

## Migrations e dependências

As migrations versionadas em `supabase/migrations/` são a fonte da estrutura. Migrations já aplicadas não devem ser reescritas. O histórico de auth interno, Storage e configurações externas deve ser tratado separadamente de dumps `public`.

## Ambientes

- Local: Supabase/Docker local, credenciais sintéticas privadas e sem dados de produção.
- Preview: deployment associado à branch, sem assumir equivalência com Production.
- Production: branch `main`, domínio oficial e variáveis Production; alterações somente via fluxo aprovado.

Segredos, tokens, cookies e senhas não pertencem à documentação versionada.
