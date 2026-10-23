# Proposta de escopo — P10 a P13

Status: proposta para aprovação do responsável, atualizada em 23/10/2026. O P10 está em andamento (ver situação abaixo); P11 a P13 não foram iniciadas. Os itens "fora do escopo" protegem decisões já tomadas (financeiro congelado, integração de equipamentos só no piloto).

## P10 — Comunicação e governança

**Objetivo:** síndico e gestor comunicam e registram decisões dentro do sistema.

**Decisões registradas**
- Comunicados saem somente pelo aplicativo, sem e-mail.
- Síndico e gestor podem publicar comunicados.
- Votações seguem as regras de quórum e aprovação do estatuto (art. 11), com contagem de associados por pessoa e de votos por lote ou unidade (art. 14). Essas regras estão implementadas (PR #114) e em produção desde 23/10.

**Dentro do escopo**
- Comunicados para moradores, com destinatários por unidade ou estrutura, leitura e confirmação.
- Atas de reunião, com presença e decisões.
- Votações simples: pauta, prazo, resultado por unidade e aplicação do quórum configurado.

**Fora do escopo:** chat entre moradores, WhatsApp e envio em massa por canais externos.

**Pendências:** testes de votação em produção, com um condomínio de teste e dados identificados. Atas de reunião ainda não iniciadas.

**Situação em 23/10/2026**
- Comunicados: concluídos e validados em produção. Entregues: tabelas e políticas de acesso (migration `communications`, aplicada em produção em 23/10), telas de publicação e leitura, filtro por unidade ou estrutura, confirmação de leitura, link no menu do morador (PR #113, PR #116 e PR #117).
- Teste em produção em 23/10: o síndico publicou um comunicado para um bloco de teste, e o morador vinculado à unidade viu o comunicado no menu. Os dados de teste foram removidos depois.
- Votações: regras de quórum e aprovação do estatuto e registro de lotes em dia, presença e totais (PR #114). Em produção desde 23/10 (PR #121), com testes de produção ainda pendentes.
- Atas de reunião: não iniciadas.
- Percentual do P10: a definir, porque o critério de percentual do cronograma ainda não cobre fases parciais.

## P11 — Compliance condominial

**Objetivo:** cumprir a LGPD na operação e manter a documentação de conformidade.

**Decisões registradas**
- Pedidos de titulares (acesso, correção, exclusão) são recebidos pelos próprios moradores, pelo sistema.
- O histórico do morador deve ser mantido.

**Proposta de tratamento para pedido de exclusão (a validar com o jurídico)**
- Apagar: foto, documento, telefone e e-mail.
- Manter: unidade, período de morada, movimentações e autorizações, com o nome substituído por identificação anonimizada.

**Base legal da portaria (hipótese a validar com o jurídico do cliente)**
- Controle de visitantes e prestadores: legítimo interesse do condomínio, segurança e controle de acesso (LGPD, art. 7º, IX).
- Foto de identificação, sem reconhecimento facial: tratada como legítimo interesse, com a mesma finalidade.
- Reconhecimento facial, se houver na P13: dado sensível, com base própria (LGPD, art. 11). Não implementar sem essa definição.

**Dentro do escopo**
- Política de retenção (90 dias já decidido para foto e documento).
- Registro de consentimento, com data e versão do texto.
- Fluxo de pedido de titular, com exportação e exclusão conforme a proposta acima.
- Relatório de dados pessoais guardados e prazos.

**Fora do escopo:** o texto jurídico final e a base legal definitiva, que dependem do jurídico do cliente.

**Pendências:** validação jurídica da base legal e do modelo de anonimização; confirmar se o pedido também chega ao gestor, além do síndico.

## P12 — Automação e IA

**Objetivo:** reduzir tarefas repetitivas, com aprovação humana em toda ação relevante.

**Ordem sugerida**
1. Lembrete de OS vencida ou próxima do prazo (parte já existe).
2. Aviso de contrato perto do fim (já existe, com antecedência de 7 dias).
3. Resumo semanal de ocorrências e solicitações para o síndico.
4. Sugestão de categoria para nova ocorrência, com confirmação humana.

**Decisão registrada:** começar sem IA externa. Itens 1 e 2 não dependem de IA.

**Condições para usar IA externa (itens 3 e 4)**
- Não enviar dados pessoais (nome, telefone, CPF, endereço). Os textos são anonimizados antes do envio.
- Contrato de processamento de dados com o fornecedor, sem uso dos dados para treinar modelos.
- Regra de transferência internacional conforme a LGPD, validada pelo jurídico.

**Fora do escopo:** decisões automáticas sem aprovação humana, como aprovar pagamentos, liberar acesso ou aplicar multas.

**Pendência:** escolha do fornecedor, só quando os itens 3 e 4 forem priorizados.

## P13 — Integrações avançadas

**Objetivo:** conectar o CondoVia a sistemas externos, começando pelo controle de acesso.

**Decisões registradas**
- Primeira integração: controle de acesso.
- Já existe fornecedor de equipamento definido para o piloto.

**Dentro do escopo (piloto)**
- Integração com o equipamento escolhido, conforme o contrato de integração já documentado.
- Cadastro de pessoas e veículos no equipamento, e leitura de eventos de entrada e saída.
- Contingência: operação manual pela portaria se o equipamento ficar indisponível.

**Fora do escopo:** reconhecimento facial em produção, sem base legal definida na P11.

**Pendências**
- Modelo do equipamento do piloto.
- Documentação de integração entregue pelo fornecedor (API, eventos e cadastro). Hoje só temos informações públicas, listadas em `equipamentos-controle-acesso.md`.

## Ordem sugerida

1. P10 (reaproveita notificações; falta só o quórum).
2. P11 (depende da validação jurídica).
3. P12 (itens 1 e 2 podem começar já; itens 3 e 4 dependem de fornecedor).
4. P13 (depende da documentação do fornecedor).
