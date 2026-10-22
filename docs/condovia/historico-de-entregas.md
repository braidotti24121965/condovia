# Histórico de versões e entregas

| Marco | Estado | Referência |
|---|---|---|
| Fundação SaaS, identidade e autorização | Concluído | Handoff MVP-1 e migrations versionadas |
| P1–P6 | Concluídas | Handoff de 06/10/2026 |
| P7 / MVP-1 | Concluído, publicado e homologado segundo handoff | 06/10/2026 |
| PR #10 — detalhes de ocorrências | Integrado à main | Redesign de detalhes de ocorrências |
| PR #11 — refinamento de ocorrências | Integrado à main | Refinamento visual pontual; checks Vercel concluídos |
| P8 — Manutenção (PRs #13–#36) | Integrado à main; homologação funcional pendente | 08–09/10/2026 |
| PRs #37–#42 — feedback de navegação, autenticação e validação de dados pessoais | Integrados à main | 09–10/10/2026 |
| PR #44 — recuperação de senha por ambiente | Integrado à main e validado em produção | 19/10/2026 |
| PR #49 — recuperação de migrations da homologação e correção de permissão por vínculo ativo | Integrado à main | 19/10/2026 |
| PR #47 — endurecimento de importações | Integrado à main | 19/10/2026 |
| Janela de produção — reconciliação do histórico P8 e aplicação de 24 migrations | Concluída com backup e verificações SQL | 19/10/2026 |
| PR #45 e PR #50 — documentação de ambientes, cronograma e reconciliação | Integrados à main | 19/10/2026 |
| Janela de homologação — histórico ajustado e migrations de importação aplicadas | Concluída com backup | 19/10/2026 |
| PR #46 — filtros e listagens de pessoas, moradores e proprietários | Integrado à homologação | 19/10/2026 |
| PR #43 — consolidação da homologação 10–19/10 | Integrado à main e testado em produção | 19/10/2026 |
| PR #92 — saída automática de passe de visitante | Integrado à homologação | 21/10/2026 |
| PR #93 — intervalo mínimo entre movimentos do mesmo passe (120 s) | Integrado à homologação | 21/10/2026 |
| PR #94 — cadastro com foto, documento e placa; confirmação do porteiro; políticas do bucket `gatehouse-photos` | Integrado à homologação; migrations 20261022100000, 20261022110000 e 20261022120000 aplicadas na homologação | 22/10/2026 |
| PR #95 — intervalo mínimo entre movimentos do mesmo passe reduzido para 30 s | Integrado à homologação; teste do porteiro aprovado pelo responsável | 22/10/2026 |
| PR #97 — evolução da portaria no cronograma | Integrado à homologação | 22/10/2026 |
| PR #98 — congelamento do módulo Financeiro (P9), oculto em todos os ambientes | Integrado à homologação | 22/10/2026 |
| PR #99 — promoção da portaria para produção (migrations aplicadas com backup prévio) | Integrado à produção | 22/10/2026 |
| PR #52 — recuperação de senha (mesclada na produção por engano) | Revertida na produção pela PR #103; reabrir só após validação na homologação | 22/10/2026 |
| PR #103 — reversão da PR #52 na produção | Integrado à produção | 22/10/2026 |
| PR #100 e PR #101 — documentação de retenção e cronograma | Integrados à homologação | 22/10/2026 |
| PR #102 — rotina de retenção de 90 dias (foto, documento e placas) | Integrado à homologação e à produção (PR #104) | 22/10/2026 |
| PR #104 — promoção da retenção para produção, com migration aplicada e backup prévio | Integrado à produção | 22/10/2026 |

## Regra para o histórico

Hashes abreviados preservam rastreabilidade sem repetir toda a linha do tempo. A situação atual de PRs e deployments deve ser confirmada no GitHub/Vercel no momento da decisão; datas futuras ou conclusões sem evidência são marcadas como “A planejar”.
