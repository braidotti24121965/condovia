# Contrato de integração — acesso facial de visitantes

**Status:** proposta para levantamento e decisão. Não é uma implementação.

**Escopo:** definir o contrato mínimo entre o CondoVia e os equipamentos de controle de acesso facial Intelbras SS 3532 MF, Hikvision DS-K1T671MF e Hikvision DS-K1T673DX-BR. Este documento não chama equipamentos, não define API específica e não autoriza a instalação ou o tratamento de biometria.

## 1. Princípios

- O equipamento decide apenas se uma tentativa local foi reconhecida, negada ou registrada como passagem; a autorização de acesso continua sendo uma decisão do CondoVia.
- Todo evento deve ser associado a um equipamento e a um ponto de acesso cadastrado, com relógio sincronizado e identificação do dispositivo.
- Falhas de comunicação, ausência de consentimento, autorização vencida ou identidade não vinculada devem resultar em negação ou estado inconclusivo, nunca em liberação presumida.
- O sistema deve manter idempotência: receber novamente o mesmo evento não pode registrar duas entradas ou duas saídas.
- Dados biométricos não devem ser enviados ao CondoVia enquanto não houver base legal, finalidade, política de retenção e contrato aprovados.

## 2. Eventos que cada equipamento deve informar

Os três modelos devem ser avaliados contra o mesmo contrato lógico. O fabricante pode usar nomes diferentes para os eventos, mas precisa fornecer uma forma documentada de obter os campos abaixo.

### 2.1 Evento de entrada

O equipamento deve informar:

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `event_id` | Sim | Identificador único e estável do evento no equipamento. |
| `event_type` | Sim | `entry` ou equivalente documentado. |
| `person_id` | Sim | Identificador da pessoa reconhecida, sem depender do nome exibido. |
| `occurred_at` | Sim | Data e hora em ISO 8601, com fuso ou offset explícito. |
| `access_point_id` | Sim | Identificador do ponto/porta/leitor que originou o evento. |
| `device_id` | Sim | Identificador do equipamento que produziu o evento. |
| `decision` | Sim | `granted`, `denied` ou `unknown`, com motivo quando não concedido. |
| `recognition_method` | Sim | Deve distinguir face, cartão, senha, QR ou outro método. |
| `received_at` | Recomendado | Momento em que o CondoVia recebeu o evento, separado de `occurred_at`. |

### 2.2 Evento de saída

Deve usar o mesmo envelope de evento, com `event_type: exit`, preservando `event_id`, `person_id`, `occurred_at`, `access_point_id`, `device_id`, `decision` e `recognition_method`. O ponto deve indicar que se trata de uma saída, e não apenas repetir o identificador físico da entrada.

### 2.3 Evento de negação

Uma tentativa negada não pode ser representada apenas por ausência de evento. O equipamento deve emitir `event_type: denied` ou equivalente, contendo:

- identificador da pessoa, quando a face tiver sido associada a uma pessoa;
- identificador da tentativa, mesmo quando a pessoa não for identificada;
- horário, ponto e equipamento;
- motivo normalizado, por exemplo: pessoa desconhecida, autorização ausente, autorização expirada, fora da validade, dispositivo offline, falha de reconhecimento ou regra local;
- nível de confiança/qualidade somente se o fabricante documentar seu significado e sua utilização for aprovada.

Quando não houver `person_id`, o evento deve usar um `attempt_id` e declarar explicitamente `person_id: null`; não se deve inventar uma identidade.

### 2.4 Requisitos de entrega dos eventos

Cada equipamento precisa informar se suporta eventos em tempo real, consulta histórica, exportação e reentrega. O contrato deverá definir:

- ordenação, paginação e janela máxima de consulta;
- garantia de entrega, reenvio e comportamento após queda de rede ou energia;
- deduplicação por `event_id`;
- sincronização de relógio, horário de verão e fuso;
- assinatura, autenticação e criptografia do canal;
- limites de taxa, tamanho de lote e retenção no próprio equipamento;
- como identificar troca, reset ou remoção do equipamento.

## 3. O que o CondoVia precisa enviar

O envio para um equipamento só poderá ocorrer depois de aprovado o modelo de segurança e de privacidade do fabricante.

### 3.1 Cadastro da pessoa

O CondoVia deve enviar somente os dados necessários para a identificação operacional:

- `person_id` interno estável do CondoVia;
- nome de exibição, se exigido pela interface do equipamento;
- identificador externo do equipamento, quando já existir;
- método de identificação autorizado, por exemplo face, sem enviar dados além do necessário;
- estado do cadastro: ativo, suspenso ou removido;
- referência de auditoria, como versão e data da sincronização.

O sistema não deve enviar CPF, documentos, observações, dados de unidade ou dados de terceiros como texto livre, salvo justificativa aprovada.

### 3.2 Autorização e validade

A autorização de visitante deve ser representada separadamente do cadastro da pessoa. O envio precisa incluir:

- `authorization_id` do CondoVia;
- `person_id` autorizado;
- condomínio e unidade de contexto, quando necessários para a regra de acesso;
- pontos de acesso permitidos;
- início e fim da validade, com fuso explícito;
- dias/horários permitidos, se aplicável;
- estado: ativa, cancelada, expirada ou suspensa;
- identificador da versão da autorização;
- política de ação quando a autorização mudar ou vencer.

O equipamento pode receber uma regra local para operar durante uma indisponibilidade, mas essa exceção deverá ser explicitamente aprovada, limitada por tempo e auditável.

### 3.3 Remoção e revogação

Cancelar uma autorização deve revogar o acesso sem apagar automaticamente o histórico de eventos. O sistema precisa distinguir:

1. **revogar autorização:** impede novas entradas, mantendo o cadastro da pessoa se houver outra finalidade válida;
2. **suspender pessoa:** impede temporariamente os acessos vinculados;
3. **remover credencial facial:** elimina a credencial biométrica do equipamento e do provedor, quando aplicável;
4. **excluir cadastro:** remove a pessoa do equipamento quando não houver retenção legal ou outra autorização vigente.

Cada operação deve retornar confirmação, status por equipamento e erro acionável. Se o equipamento não confirmar a remoção, o CondoVia deve marcar a sincronização como pendente e não declarar o acesso revogado como concluído.

## 4. Consentimento, biometria e LGPD

Biometria facial é dado pessoal sensível pela LGPD. Este documento não escolhe sozinho a base legal: o controlador deve validar com o responsável jurídico e registrar a hipótese aplicável do art. 11 da Lei nº 13.709/2018. Consentimento, quando adotado, deve ser livre, informado, inequívoco, destacado e revogável; não pode ser presumido pelo simples cadastro do visitante.

### 4.1 Quem deve consentir

- A pessoa visitante a quem a face pertence deve consentir diretamente, quando essa for a base legal aprovada.
- O morador, administrador ou porteiro pode solicitar ou registrar uma autorização de visita, mas não pode consentir em nome do visitante adulto.
- Para criança ou adolescente, o fluxo deve ser definido pelo controlador com orientação jurídica específica, incluindo representação legal e melhor interesse.
- O operador do equipamento deve ter acesso apenas ao necessário para executar sua função; não deve consentir pelo visitante.

### 4.2 O que pode ser armazenado

O desenho preferencial é armazenar no CondoVia apenas:

- `person_id` e metadados de autorização;
- status de consentimento/base legal, versão do aviso, data, finalidade, canal e revogação;
- identificadores técnicos de sincronização e auditoria;
- eventos de entrada, saída e negação, com os campos do contrato.

O CondoVia não deve armazenar foto facial, vídeo, imagem capturada, vetor biométrico ou template facial por padrão. Se o fabricante exigir template no equipamento ou em nuvem, isso deverá ser documentado como tratamento separado, com controlador, operador, local, criptografia, acesso e retenção definidos. Não armazenar imagens de tentativas por padrão.

### 4.3 Prazo de retenção

Os prazos abaixo são uma proposta para aprovação, não uma decisão final:

- autorização e consentimento: durante a validade da visita e pelo prazo necessário para demonstrar a regularidade do tratamento;
- credencial/template no equipamento: somente até a revogação, expiração ou encerramento da finalidade, com prazo técnico máximo definido no contrato;
- eventos de acesso e negação: pelo prazo da política de auditoria e segurança do condomínio, limitado ao necessário;
- imagens, snapshots e logs técnicos: não reter, salvo incidente documentado ou obrigação específica, com prazo curto e acesso restrito.

O prazo final deve constar na política de privacidade, no registro de operações e no contrato com o fornecedor. Ao fim da retenção, executar eliminação segura ou anonimização verificável, inclusive em backups e serviços de nuvem do fabricante quando aplicável.

### 4.4 Revogação e direitos do titular

O visitante deve conseguir revogar o consentimento por canal acessível, sem depender do fabricante. A revogação deve:

- registrar data, hora, origem e versão da solicitação;
- bloquear novas autorizações faciais;
- solicitar a remoção da credencial nos equipamentos e serviços envolvidos;
- manter somente os registros que tenham outra base legal ou obrigação de retenção;
- informar o resultado ou eventual pendência de sincronização.

O processo deve atender, conforme aplicável, confirmação de tratamento, acesso, correção, eliminação, informação sobre compartilhamento e revisão do tratamento, sem expor biometria ou segredo técnico ao titular.

## 5. Pontos em aberto e pedido aos fabricantes

Nenhum dos três modelos deve ser considerado homologado para integração antes de respostas documentadas, testes controlados e aprovação de privacidade.

### 5.1 Intelbras SS 3532 MF

Solicitar à Intelbras:

- documentação oficial de API/SDK, webhook, ONVIF ou outro mecanismo suportado para eventos de entrada, saída e negação;
- dicionário completo de eventos, incluindo `person_id`, horário, ponto, `device_id`, `event_id`, método e motivo da negação;
- identificação do ponto quando houver múltiplos leitores/portas;
- cadastro, atualização, validade, suspensão, revogação e remoção de pessoa e credencial facial;
- comportamento offline, fila, reenvio, duplicidade, perda de energia e retenção local;
- sincronização de horário e configuração de fuso;
- localização do template facial, possibilidade de não armazenar imagem e eliminação segura;
- autenticação, TLS, rotação de credenciais, auditoria e permissões;
- limites, licenciamento, versões de firmware e compatibilidade do método de integração;
- declaração de suboperadores, nuvem envolvida, localização dos dados e prazos de retenção.

### 5.2 Hikvision DS-K1T671MF

Solicitar à Hikvision:

- especificação da API/SDK e suporte a eventos de entrada, saída, negação e identificação desconhecida;
- campos e semântica de `person_id`, `event_id`, timestamp, leitor/ponto, motivo e método;
- endpoints/ações para cadastrar, alterar, vincular validade, suspender, revogar e excluir pessoa e face;
- regras locais e precedência entre autorização do equipamento e autorização do CondoVia;
- fila e reentrega de eventos, paginação histórica, idempotência e retenção;
- sincronização de relógio, fuso e comportamento em mudanças de horário;
- armazenamento e proteção de templates, fotos, snapshots e logs, incluindo desativação de snapshots;
- segurança de transporte, autenticação, privilégio mínimo, logs administrativos e atualização de firmware;
- requisitos de licença, controladora intermediária, nuvem e suboperadores;
- procedimento comprovável de exclusão e resposta a solicitação de titular.

### 5.3 Hikvision DS-K1T673DX-BR

Solicitar à Hikvision:

- as mesmas informações do DS-K1T671MF, confirmando especificamente as diferenças de firmware, API/SDK e capacidade de eventos;
- quantidade e natureza dos pontos/leitores representados pelo dispositivo;
- suporte a entrada, saída, negação e pessoa não identificada no mesmo formato de evento;
- limites de pessoas, faces, autorizações, horários e eventos armazenados;
- operação em rede local sem nuvem e comportamento quando o servidor do CondoVia estiver indisponível;
- cadastro e remoção remotos, incluindo confirmação de conclusão em cada dispositivo;
- exportação de auditoria e correlação entre evento, pessoa, ponto e operador;
- política de retenção e eliminação de dados biométricos e imagens;
- compatibilidade entre versões de firmware, países/região BR e suporte durante o ciclo de vida.

### 5.4 Entregáveis comuns exigidos antes da decisão

Para cada modelo, pedir:

1. manual/API/SDK vigente e matriz de versões;
2. exemplo real, anonimizado, de cada evento exigido;
3. ambiente de teste ou equipamento para ensaio sem dados reais;
4. roteiro de cadastro, revogação, remoção e recuperação após falha;
5. declaração de segurança, privacidade, suboperadores e localização dos dados;
6. evidência de retenção e exclusão do template/imagem;
7. suporte, SLA, licenças e custos recorrentes;
8. confirmação escrita de que o fabricante aceita o contrato de eventos deste documento ou lista de adaptações necessárias.

## 6. Critérios para considerar o contrato pronto

O contrato só poderá virar implementação quando houver:

- decisão do responsável sobre a base legal e o fluxo de consentimento;
- política de retenção aprovada;
- respostas dos fabricantes e escolha do modelo de integração;
- testes de entrada, saída, negação, pessoa desconhecida, revogação, expiração, offline e reenvio;
- definição de controlador, operador, suboperadores e responsabilidades por incidente;
- confirmação de que nenhum acesso é liberado por ausência, atraso ou ambiguidade de evento;
- aprovação explícita para iniciar código, equipamentos, dados de teste ou alterações de banco.
