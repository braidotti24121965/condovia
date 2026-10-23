# Cronograma e roadmap consolidados

Data de referência: 23/10/2026 (após a equalização entre homolog e produção e os testes de comunicados em produção). Datas de conclusão vêm do histórico Git de `main`. O XLSX original permanece como baseline histórica.

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
| Consolidação 10–19/10 | Validações de pessoas e vínculos, filtros e listagens, importação endurecida, recuperação de senha por ambiente, correção de permissão por vínculo ativo | 10–19/10/2026 | 100% |

## Fase em andamento

### P8 — Manutenção: 100%

| Item | Peso | Situação |
|---|---:|---|
| Código integrado à `main` (P8.1–P8.3 e entrega integral, PRs #13–#36) | 40% | Concluído (08–09/10) |
| Testes técnicos (lint, typecheck, build, unitários, pgTAP via PGlite) | 10% | Concluído |
| Publicação e migrations em homologação | 10% | Concluído (19/10: migrations conferidas na homologação) |
| Correções de homologação integradas à `main` (PR #43) | 10% | Concluído (19/10, `5b89a78`; testado em produção) |
| Homologação funcional formal (Storage real, `pg_cron`, fluxos completos) | 15% | Concluído (22/10/2026, aceito pelo responsável em 23/10; alçada do Conselho fora do escopo por decisão do responsável) |
| Migrations conciliadas e aplicadas em produção | 15% | Concluído (19/10: histórico P8 reconciliado, schema conferido por fingerprint, 24 migrations aplicadas) |

Situação em 23/10/2026: o código da manutenção está na `main`, e as tabelas, o bucket privado e o job diário existem na homologação e na produção. Homologação funcional feita em 22/10 no condomínio de teste, com aprovação de: solicitação, OS a partir da solicitação, atribuição, execução, registro técnico, validação, documento com download temporário, plano preventivo sem duplicar o ciclo, alerta de contrato vencendo, aprovação acima do limite pela alçada do Gestor e isolamento entre condomínios. Defeito encontrado (OS a partir de solicitação sem complemento) corrigido pela PR #107 e validado. Homologação aceita pelo responsável em 23/10/2026. A alçada do Conselho ficou fora do escopo por decisão do responsável e não será testada.

## Evolução da portaria após 19/10/2026 (checklist)

Entregas da portaria feitas depois da data de referência acima. Os itens são marcados como concluídos somente quando estão integrados à `homolog` e validados pelo responsável. Nada disso está em produção.

| Item | Situação | Referência |
|---|---|---|
| Passe de visitante por QR, lido pela câmera e validado pelo servidor (token com hash, sem dados pessoais no QR) | Concluído na homologação | PR #80 e anteriores |
| Expiração automática: passes vencidos registram saída automaticamente a cada 10 minutos | Concluído na homologação (migration aplicada e verificada) | PR #92 |
| Trava de intervalo mínimo entre movimentos do mesmo passe | Concluído na homologação; teste aprovado com intervalo de 30 segundos | PR #93, PR #95 |
| Cadastro de visitante e prestador com foto pela câmera, documento válido (CPF, RG, CNH ou passaporte) e placa de veículo | Concluído na homologação | PR #94 |
| Autorização recusada para cadastro incompleto e para visitante criado na hora | Concluído na homologação | PR #94 |
| Completar cadastro antigo (visitante e prestador) pela tela de portaria | Concluído na homologação | PR #94 |
| Confirmação do porteiro com foto e dados antes de registrar entrada ou saída, sem registro automático pela leitura | Concluído na homologação; teste aprovado pelo responsável | PR #94 |
| Bloqueio de entrada de veículo sem placa cadastrada no ponto de acesso | Concluído na homologação | PR #94 |
| Teste visual em celular e desktop das telas novas da portaria | Encerrado pelo responsável sem teste visual adicional | — |
| Aplicação das migrations da portaria em produção | Concluído em 22/10/2026 (com backup prévio e conferência) | PR #99 |
| Retenção de foto e documento por 90 dias após o fim da última autorização | Decidido em 22/10/2026; rotina de exclusão ainda não implementada | Ver decisoes-ativas.md |
| Remoção dos dados de teste da homologação (visitante de teste com eventos protegidos pelo trigger de auditoria) | Pendente, depende de decisão sobre o trigger | — |

Percentual da evolução da portaria: a definir pelo responsável. Esta seção não altera os percentuais das fases acima.

## Fases futuras

| Fase | Situação | Próximo critério | % |
|---|---|---|---|
| P9 — Financeiro | Congelado pelo responsável em 22/10/2026, sem data para retomar. Menu e páginas ocultos em todos os ambientes (PR #98) | Nova decisão de fase | 0% |
| P10 — Communication & Governance | Em andamento. Comunicados concluídos e validados em produção em 23/10 (leitura, publicação, filtro por unidade e menu do morador). Votações em produção desde 23/10 (PR #121), com quórum e aprovação conforme o estatuto (art. 11); testes de votação em produção pendentes. Atas não iniciadas | Testes de votação em produção e atas | a definir |
| P11 — Compliance Condominial | A planejar | Requisitos e LGPD | 0% |
| P12 — Automation & AI | A planejar | Arquitetura, riscos e dados | 0% |
| P13 — Advanced Integration | A planejar | Dependências externas | 0% |
| Controle de acesso inteligente | A planejar | Levantamento de equipamentos, APIs e LGPD | 0% |

## Consolidado

- MVP (MVP-0 a P7): **100%**.
- Roadmap pós-MVP (P8 a P13, pesos iguais): **17%** (P8 em 100%). O P10 tem percentual a definir e, por enquanto, entra na média como 0%.

## Próximos ajustes (em ordem de prioridade)

1. **Testes de votação em produção:** definir o condomínio e os lotes do teste, com dados identificados como teste, e registrar o resultado aqui.
2. **Erro intermitente do dashboard:** investigar pelos logs da Vercel se voltar a acontecer.
3. **DNS do DKIM:** conferir se só sobrou o registro `titan1._domainkey` correto, após o TTL.
4. **Limpeza:** contas de teste do conselho e da gestora na homologação, se for necessário.

Concluídos em 23/10/2026:
- **Recuperação de senha em produção:** link do e-mail direcionado para `/auth/confirm`, com o template ajustado no Supabase. Validado com uma conta de morador.
- **Equalização dos ambientes:** código da `main` e da `homolog` iguais; migrations de comunicados e assembleias aplicadas nos dois ambientes. Migrations de finanças (P9) seguem só na homolog, por decisão do responsável.
- **Estruturas de teste na produção:** inativadas (sem exclusão), porque têm equipamentos e solicitações de manutenção vinculados.

## Pendências transversais

- PR #40 (feedback de navegação e ajustes de manutenção): revisar e integrar ou encerrar.
- PR #48 (Financeiro P9, rascunho): revisão funcional antes de qualquer merge.
- Homologação: reconciliar o histórico de migrations (aliases); até lá, não usar `supabase db push` nela.
- Arquivar fora do Git as evidências de homologação (planilhas, CSVs, capturas) que estão só na pasta local.
- Observabilidade centralizada, rate limit/concurrency, retenção e índices (backlog do P7).
- Backup e restauração cobrindo Auth, Storage e configurações, não só o schema `public`.
- Revisão das funções legadas `SECURITY DEFINER`.
- Portaria: aplicar em produção as migrations de QR, expiração, cadastro com foto e identidade do porteiro, e fazer o teste visual das telas novas.

## Próxima fase futura: controle de acesso inteligente

Levantar equipamentos faciais e leitores de placas, fabricantes, modelos, firmware e APIs; definir integração segura, autorização de moradores e veículos, eventos, LGPD, piloto e contingência. Não iniciar integração nesta fase.

Levantamento inicial dos equipamentos e pendências por modelo: [equipamentos-controle-acesso.md](equipamentos-controle-acesso.md).

Responsáveis e datas futuras sem aprovação permanecem como **A planejar**.
