# Ambientes do CondoVia

Data de referência: 19/10/2026. Este documento registra onde cada ambiente roda e como ele é alimentado. Não contém chaves, senhas ou tokens; valores sensíveis ficam somente na Vercel, no Supabase e em `.env.local`.

## Visão geral

| Ambiente | Aplicação | Supabase | Vercel | Origem do código |
|---|---|---|---|---|
| Produção | `https://condovia.kynovia.com.br` | `https://bmaglizdavsrwbenzenp.supabase.co` | Projeto `braidotti/condovia`, ambiente **Production** | Branch `main` |
| Homologação | `https://homolog-condovia.kynovia.com.br` | `https://kgvbmisocqmsxcibpumq.supabase.co` | Projeto `braidotti/condovia`, ambiente **Preview** com domínio de homologação | Branch de homologação (em 19/10/2026: `codex/documentation-consolidation`, PR #43) |
| Local | `http://localhost:3000` | Supabase local via Docker (API em `127.0.0.1:15421`) | — | Branch de trabalho |

- Repositório: `https://github.com/braidotti24121965/condovia`
- Vercel: `https://vercel.com/braidotti/condovia`
- O site de homologação fica atrás da proteção de deployment da Vercel; é necessário estar autenticado na Vercel para abri-lo.

## Variáveis de ambiente na Vercel

| Variável | Production | Preview (homologação) |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://condovia.kynovia.com.br` | `https://homolog-condovia.kynovia.com.br` |
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto de produção | Projeto de homologação |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública de produção | Chave pública de homologação |

`NEXT_PUBLIC_APP_URL` é lida no build. Depois de alterá-la, é necessário um novo deploy do ambiente correspondente.

Ela é usada para montar links enviados por e-mail: recuperação de senha, convite de morador e onboarding de cliente. Nunca fixar URLs de ambiente no código; usar `resolveAppOrigin` (`src/lib/auth/app-origin.ts`), que prioriza `NEXT_PUBLIC_APP_URL` e, na ausência dela, usa o host da própria requisição.

> Histórico: o PR #41 fixou a URL de homologação na recuperação de senha e quebrou o fluxo em produção. O PR #44 (19/10/2026) restaurou o uso da URL de cada ambiente e foi validado em produção.

## Supabase Auth

Em cada projeto Supabase, **Authentication → URL Configuration** deve conter:

- Site URL: o domínio do próprio ambiente.
- Redirect URLs: `<domínio do ambiente>/auth/callback**`.

`supabase/config.toml` reflete a configuração de Auth registrada no MVP-0 (`site_url` `condovia-five.vercel.app` e `external_url` do projeto de produção). Não executar `supabase config push` com esse arquivo sem antes revisar esses valores contra o painel do projeto de destino, pois isso sobrescreve a configuração de Auth remota.

## Fluxo de publicação

1. Trabalhar em branch e abrir PR para `main`.
2. Validar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`; conferir o Preview da Vercel.
3. Publicar em homologação pela branch de homologação e executar a validação manual.
4. Integrar em `main` somente após aprovação; isso dispara o deploy de **Production**.
5. Aplicar migrations primeiro em homologação e depois em produção, conciliando o histórico por nome e conteúdo.

A branch de homologação deve ser atualizada a partir de `main` com frequência; caso contrário, homologação e produção divergem (correções presentes em um ambiente e ausentes no outro).
