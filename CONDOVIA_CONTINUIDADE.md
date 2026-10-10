# CondoVia — Documento de continuidade

> Documento de retomada para novas conversas, testes e perda de contexto.
> Atualizado em 09/10/2026, horário de São Paulo.

## Como retomar

Repositório: https://github.com/braidotti24121965/condovia  
Sistema de produção: https://condovia.kynovia.com.br  
Preview atual da PR #40: https://condovia-a48zv9q7e-braidotti.vercel.app/login  
PR em andamento: https://github.com/braidotti24121965/condovia/pull/40

Ao retomar, usar o Preview mais recente da PR #40, pedir ao usuário apenas o login se a sessão não estiver disponível e seguir os testes funcionais do módulo Manutenção. Não corrigir divergências sem informar o problema e obter decisão, salvo quando a conversa já autorizar explicitamente a correção.

## Objetivo do projeto

O CondoVia é um sistema de gestão de condomínios. O trabalho atual está concentrado na homologação funcional do módulo **Manutenção**, incluindo equipamentos, solicitações, ordens de serviço, fornecedores, contratos, documentos, preventivas, custos, aprovações, alçadas e requisitos.

## Ambientes e dados

- Produção usa o projeto Supabase `bmaglizdavsrwbenp`.
- Preview/homologação usa o projeto Supabase `kgvbmisocqmsxcibpumq`.
- O schema de manutenção da homologação foi alinhado ao de produção pela migração `maintenance_complete_preview_alignment`.
- A migração criou/alinhou tabelas, funções, permissões e regras do módulo; não copiou dados pessoais ou registros de produção.
- A sessão do usuário é independente por Preview. Cada novo domínio da Vercel pode exigir novo login.

## Decisões tomadas

1. Anexos continuam habilitados mesmo após a OS concluída ou cancelada, para permitir documentação posterior por usuários autorizados.
2. Quando uma consulta de documentos não encontra registros, o sistema deve informar o usuário com mensagem visível.
3. A geração de OS preventivas deve informar quantas OS foram criadas ou que nenhuma estava elegível.
4. O perfil aprovador deve aparecer junto da alçada salva, sem exigir abertura do detalhe para identificação básica.
5. O aviso global “Salvando…” não deve aparecer no login, logout nem em formulários que já tenham feedback próprio, como upload com “Enviando…”.
6. Status da OS e prioridade devem ser apresentados em um bloco visual identificado, e não como dois badges soltos no canto.

## Histórico de entregas

| Entrega | Resultado |
|---|---|
| PR #29 | Integrada; Vercel aprovada. |
| PR #35 | Feedback para consulta de documentos sem anexos. |
| PR #36 | Feedback da geração de OS preventivas. |
| PR #37 | Feedback global de navegação e preservação de rolagem. |
| PR #38 | Limpeza do feedback após mudança de rota. Integrada. |
| PR #39 | Exclusão do feedback global no login. Integrada no commit `704b914`. |
| PR #40 | Em andamento: exclusão no logout, limpeza do feedback na mesma rota, Suspense para build, melhoria visual dos status da OS. |

## Testes já realizados

### Autenticação e navegação

- Login validado no Preview.
- Logout validado; a correção foi incluída na PR #40.
- Contexto “CondoVia Homologação” e perfil Gestor do condomínio carregados.
- Navegação entre as telas de manutenção funcionando.
- O build da correção com `useSearchParams` exigiu `Suspense`; essa falha foi corrigida no commit `dea616e`.

### Fornecedores

- Todos os campos foram preenchidos.
- CNPJ inválido foi bloqueado.
- Documento duplicado foi informado corretamente.
- Fornecedor de teste criado: “Fornecedor Teste Operacional”.

### Contratos

- Fornecedor vinculado.
- Título, vigência, valor e observações preenchidos.
- Contrato de teste criado com valor de R$ 1.500,00 e vigência de 09/10/2026 a 09/10/2027.

### Ordens de serviço

- OS existentes consultados.
- Cancelamento da OS #3 executado com motivo.
- Confirmado no banco e na tela: OS #3 passou de Aberta para Cancelada.
- Histórico registrou o evento de cancelamento.
- Status e prioridade foram reorganizados visualmente no cabeçalho.

### Documentos e anexos

- Estado sem documentos exibido corretamente.
- Anexo realizado na OS #3 cancelada.
- Documento “Comprovante do teste de cancelamento” registrado com sucesso.
- Histórico registrou “Documento anexado”.
- Regra de anexos após encerramento/cancelamento confirmada.

### Preventivas, custos, aprovações e governança

- Telas abertas e formulários identificados.
- Preventivas já tiveram teste de preenchimento e geração de OS em etapa anterior.
- Tipos de serviço, documentos obrigatórios, custos, alçadas e aprovações foram acessados.
- Ainda falta executar a sequência operacional completa nessas telas no Preview mais recente.

## Divergência atual em aberto

Durante o upload, o arquivo é salvo corretamente no banco e aparece após recarregar a página, mas o aviso global “Salvando…” fica visível durante o processamento. O formulário já possui o estado próprio “Enviando…”.

Próxima decisão necessária: marcar o formulário de upload com `data-navigation-feedback="off"` ou ajustar o componente global para reconhecer o término de ações sem navegação. Informar o usuário antes de corrigir, se não houver autorização explícita.

## Fase atual e cronograma

Os percentuais abaixo são estimativas de acompanhamento baseadas no checklist funcional, não métricas automáticas de código.

| Fase | Status | Percentual | Próximo passo |
|---|---:|---:|---|
| 1. Base do MVP e arquitetura | Concluída | 100% | Nenhum. |
| 2. Integração GitHub/Vercel/Supabase | Concluída | 100% | Manter verificação após merges. |
| 3. Implementação do módulo Manutenção | Praticamente concluída | 95% | Corrigir os últimos detalhes de feedback visual. |
| 4. Homologação funcional da Manutenção | Em andamento | 65% | Executar preenchimento, criação, edição, anexos, custos, aprovações, preventivas e governança. |
| 5. Estabilização visual e mensagens | Em andamento | 80% | Resolver “Salvando…” no upload e confirmar ausência de flash. |
| 6. Regressão dos demais módulos | Pendente | 20% | Retestar autenticação, permissões, dashboard e fluxos principais. |
| 7. Homologação final e aceite | Pendente | 0% | Consolidar evidências e decisão de publicação. |

### Fase atual

**Fase 4 — Homologação funcional da Manutenção, aproximadamente 65% concluída.**

O sistema já possui a base e os principais fluxos implementados. O trabalho restante é testar operações completas, e não apenas a abertura das telas, preservando os dados de teste e registrando cada divergência.

## Próxima sequência de testes

1. Corrigir ou decidir o comportamento do feedback no upload.
2. Fornecedores: editar, inativar e reutilizar em OS/contrato.
3. Contratos: editar, ativar, encerrar, validar datas e vincular documento.
4. OS: criar, atribuir, iniciar execução, registrar atividades, enviar para validação e concluir.
5. OS com custo: orçamento, cotação, aprovação, rejeição, custo efetivo e despesa.
6. Preventivas: criar plano completo, checklist, periodicidade e gerar OS elegíveis/não elegíveis.
7. Governança: tipo de serviço, contrato obrigatório, documento obrigatório, alçada, perfil aprovador e quórum.
8. Documentos: anexar, consultar, versão, destino por contrato/OS/equipamento/cotação e ausência de documentos.
9. Permissões: usuário autorizado e usuário sem permissão.
10. Regressão final no Preview e, após aceite, produção.

## Dados de teste conhecidos

- Contexto: CondoVia Homologação.
- Fornecedor: Fornecedor Teste Operacional / Empresa Teste Operacional Ltda.
- Contrato: Contrato Teste Operacional, R$ 1.500,00, 09/10/2026–09/10/2027, Rascunho.
- OS #1: concluída, teste sem custo.
- OS #2: cancelada, teste anterior.
- OS #3: cancelada durante esta rodada, com histórico e anexo.
- Anexo: “Comprovante do teste de cancelamento”.

## Regra de comunicação

Durante a homologação, relatar cada divergência com: tela, ação executada, resultado esperado, resultado observado e impacto. Aguardar decisão antes de corrigir, exceto quando o usuário tiver autorizado explicitamente a correção naquele fluxo.

