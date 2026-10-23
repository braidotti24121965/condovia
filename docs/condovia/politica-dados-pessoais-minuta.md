# Política interna de dados pessoais — minuta

**Status:** minuta para validação do jurídico do condomínio e da associação. Não é parecer jurídico e ainda não está em vigor. Os pontos marcados como "a validar" dependem dessa validação antes de qualquer implementação de regra de exclusão ou de base legal.

**Base:** Lei Geral de Proteção de Dados (Lei 13.709/2018).

## 1. Papéis

- **Controlador:** o condomínio, que decide para que os dados são tratados.
- **Operador:** o CondoViaKynovia, que trata os dados em nome do condomínio, conforme as instruções dele. O contrato entre condomínio e operador deve prever essas obrigações.
- **Titular:** moradores, proprietários, visitantes, prestadores e demais pessoas cujos dados são tratados.

## 2. Dados tratados

| Dado | Origem | Finalidade |
|---|---|---|
| Nome, CPF, documento de identidade | Cadastro de pessoa, portaria | Identificação e controle de acesso |
| Telefone e e-mail | Cadastro de pessoa | Contato e convite de acesso |
| Foto de identificação | Cadastro de visitante ou prestador | Identificação na portaria |
| Dados de vínculo: unidade, tipo de moradia, período | Cadastro de moradores e proprietários | Gestão do condomínio e direitos de voto |
| Registros de entrada e saída | Portaria, ou equipamento de acesso | Segurança e controle de acesso |
| Dados de votação e presença | Assembleias | Quórum e registro da votação |

Dados biométricos (rosto, digitais) são dado pessoal sensível (art. 5º, II). Não são tratados por este sistema até a base legal ser definida (ver seção 3.3).

## 3. Bases legais

### 3.1 Dados de cadastro e vínculo
Execução de obrigações do condomínio, previstas na convenção e no estatuto, e gestão do condomínio (art. 7º, II e IX, a validar). Não exige consentimento para a gestão ordinária.

### 3.2 Foto e documento de visitante e prestador
Hipótese proposta: legítimo interesse do condomínio em segurança e controle de acesso (art. 7º, IX), com a foto usada só para identificação na portaria, sem reconhecimento facial. A validar pelo jurídico, incluindo se é preciso informar o titular no momento do cadastro.

### 3.3 Reconhecimento facial
Dado sensível: exige base do art. 11 da LGPD. Hipóteses a validar:
- consentimento específico e destacado do titular (art. 11, I);
- garantia da prevenção à fraude e à segurança do titular em processos de identificação (art. 11, II, "g"), se o jurídico entender aplicável.

Enquanto a base não for validada, o reconhecimento facial não é usado para pessoas do condomínio.

## 4. Retenção

- **Foto e documento de visitante e prestador:** excluídos 90 dias após o fim da última autorização. Regra já implementada no sistema.
- **Registros de entrada e saída:** prazo a definir pelo jurídico, considerando obrigações de segurança e de prova.
- **Dados de vínculo e de votação:** mantidos enquanto o vínculo ou o registro tiver validade legal ou administrativa, a validar.

## 5. Pedidos de titulares (art. 18)

O titular pode pedir:
- confirmação de que há tratamento e acesso aos dados;
- correção de dados incompletos ou incorretos;
- anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;
- informação sobre compartilhamento;
- revogação de consentimento, quando ele for a base.

**Fluxo proposto:**
1. O pedido é registrado pelo próprio titular no sistema, ou entregue ao síndico, que o registra.
2. O sistema registra data, tipo do pedido e prazo de resposta. O prazo deve seguir o regulamento da ANPD, a validar.
3. O pedido vai para síndico e gestor, a decidir (ver pendência abaixo).
4. A resposta é registrada, com a ação tomada e a justificativa.

## 6. Exclusão e anonimização

**Proposta, a validar com o jurídico:**
- **Apagar:** foto, documento, telefone e e-mail.
- **Manter, com nome substituído por identificação anonimizada:** unidade, período de morada, movimentações e autorizações. A manutenção serve para cumprir obrigação legal ou para o registro do condomínio, quando aplicável.

Se o jurídico entender que alguma dessas informações precisa ser apagada, a regra muda e o sistema é ajustado.

## 7. Registro de atividades e consentimento

- Manter o registro das atividades de tratamento, com finalidade, base e prazo de cada dado.
- Quando houver consentimento, guardar a data, a versão do texto e a forma de coleta.

## 8. Segurança e incidentes

- Acesso aos dados por perfil, com trilha de auditoria nas ações sensíveis.
- Incidente de segurança: comunicar o condomínio e, quando aplicável, a ANPD e os titulares, nos prazos a validar.

## 9. Pendências para o jurídico

1. Validar as bases legais das seções 3.1, 3.2 e 3.3.
2. Validar a regra de exclusão e de anonimização da seção 6.
3. Validar os prazos de retenção da seção 4 e o prazo de resposta da seção 5.
4. Confirmar se o pedido de titular chega só ao síndico ou também ao gestor.
5. Validar o contrato entre condomínio e operador (CondoViaKynovia).

## 10. Relação com o sistema legado de leitura facial

Se a associação usa um sistema legado de leitura facial, esta política vale para os dados que o CondoViaKynovia trata. Para os dados guardados pelo sistema legado, a política precisa de um anexo específico, com o que aquele sistema faz, onde os dados ficam e como os pedidos são atendidos. Esse anexo depende de informação do fornecedor ou da associação.
