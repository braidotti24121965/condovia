# Cronograma e roadmap consolidados

Data de referência: 19/10/2026 (atualizado após a janela de produção das 17h). Datas de conclusão vêm do histórico Git de `main`. O XLSX original permanece como baseline histórica.

## Critério de percentual

- **100%**: código em `main`, publicado em produção e registrado como homologado.
- **Fase em andamento**: soma ponderada do checklist da própria fase (ver P8).
- **0%**: fase "A planejar", sem escopo funcional aprovado.

O percentual das fases futuras não indica esforço restante: elas ainda não têm escopo nem estimativa.

## Fases concluídas

| Fase | Entrega | Período | % |
|---|---|---|---|
| MVP-0 | Fundação: Auth, multi-tenant, RBAC/RLS, shell, deploy Vercel | 02/10/2026 | 100% |
| P1 | Identidade, RBAC e seleção de contexto | 02/10/2026 | 100% |
| P2 | Estruturas e unidades | 03/10/2026 | 100% |
| P3 | Pessoas, moradores, proprietários e vínculos | 03/10/2026 | 100% |
| P4 | Portaria: visitantes, prestadores, autorizações, acessos, encomendas, pontos de acesso | 04–05/10/2026 | 100% |
| P4.5 | Plataforma: Condo Master e onboarding de clientes | 05/10/2026 | 100% |
| P5 | Reservas, bloqueios, histórico e notificações | 05–06/10/2026 | 100% |
| P6 | Ocorrências e comentários | 06/10/2026 | 100% |
| P7 / MVP-1 | Dashboard, importação CSV, Professional Compact V2 e 84 baselines visuais | 06–08/10/2026 | 100% |

## Fase em andamento

### P8 — Manutenção: 75%

| Item | Peso | Situação |
|---|---:|---|
| Código integrado à `main` (P8.1–P8.3 e entrega integral, PRs #13–#36) | 40% | Concluído (08–09/10) |
| Testes técnicos (lint, typecheck, build, unitários, pgTAP via PGlite) | 10% | Concluído |
| Publicação e migrations em homologação | 10% | Concluído (indícios: publicação na branch de homologação em 10–12/10) |
| Correções de homologação integradas à `main` (PR #43) | 10% | Pendente, PR em conflito com `main` |
| Homologação funcional formal (Storage real, `pg_cron`, fluxos completos) | 15% | Pendente, testes ainda não definidos |
| Migrations conciliadas e aplicadas em produção | 15% | Concluído (19/10: histórico P8 reconciliado, schema conferido por fingerprint, 24 migrations aplicadas) |

## Fases futuras

| Fase | Situação | Próximo critério | % |
|---|---|---|---|
| P9 — Finance | A planejar | Definição funcional | 0% |
| P10 — Communication & Governance | A planejar | Definição funcional | 0% |
| P11 — Compliance Condominial | A planejar | Requisitos e LGPD | 0% |
| P12 — Automation & AI | A planejar | Arquitetura, riscos e dados | 0% |
| P13 — Advanced Integration | A planejar | Dependências externas | 0% |
| Controle de acesso inteligente | A planejar | Levantamento de equipamentos, APIs e LGPD | 0% |

## Consolidado

- MVP (MVP-0 a P7): **100%**.
- Roadmap pós-MVP (P8 a P13, pesos iguais): **12,5%**.

## Pendências transversais

- Integrar ou encerrar os PRs abertos #40 e #43 e manter a branch de homologação sincronizada com `main`.
- Observabilidade centralizada, rate limit/concurrency, retenção e índices (backlog do P7).
- Backup e restauração cobrindo Auth, Storage e configurações, não só o schema `public`.
- Revisão das funções legadas `SECURITY DEFINER`.

## Próxima fase futura: controle de acesso inteligente

Levantar equipamentos faciais e leitores de placas, fabricantes, modelos, firmware e APIs; definir integração segura, autorização de moradores e veículos, eventos, LGPD, piloto e contingência. Não iniciar integração nesta fase.

Responsáveis e datas futuras sem aprovação permanecem como **A planejar**.
