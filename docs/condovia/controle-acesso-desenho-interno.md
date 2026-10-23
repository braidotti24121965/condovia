# Controle de acesso — desenho interno (complemento ao contrato)

**Status:** proposta para revisão. Não é implementação e não chama nenhum equipamento.

**Relação com outros documentos:**
- `contrato-acesso-facial.md`: formato dos eventos, negação, dados enviados ao equipamento, LGPD e pedidos aos fabricantes.
- `equipamentos-controle-acesso.md`: levantamento público de modelos e firmwares.
- Este documento: como os eventos entram no CondoViaKynovia, quais campos o banco precisa, como os fabricantes se encaixam e como testar antes de ter um equipamento real.

## 1. O que já existe no banco

- `access_events`: registro factual de entrada e saída, ligado a visitante ou prestador, autorização, ponto de acesso e unidade. Hoje é gravado pela portaria, por um usuário (`recorded_by_user_account_id`).
- `access_points`: pontos de acesso cadastrados por condomínio, com tipo (pedestre, veículo, serviço ou misto) e status.
- `access_authorizations`: autorizações com validade, que são a fonte de decisão de liberação.

Limitações para o equipamento:
- `access_events` só aceita visitante ou prestador (`access_events_target_xor`). Morador e proprietário não entram nesse registro.
- Não há campo para origem do evento (manual ou equipamento), para o equipamento que gerou o evento, nem para o identificador externo, o que impede a deduplicação.
- Não há registro de tentativa negada. Hoje só existe entrada e saída.

## 2. Mudanças propostas no modelo

Nenhuma migration é criada agora. Quando o desenho for aprovado, a mudança deve ser feita em uma migration nova, sem alterar as antigas.

| Campo novo | Tipo | Finalidade |
|---|---|---|
| `source` | `manual` ou `device` | Diferencia o registro feito pela portaria do registro vindo do equipamento. |
| `device_id` | referência a um equipamento cadastrado | Identifica quem gerou o evento. Obrigatório quando `source = device`. |
| `external_event_id` | texto, único por equipamento | Garante idempotência: o mesmo evento recebido duas vezes não gera dois registros. |
| `decision` | `granted`, `denied` ou `unknown` | Registra a decisão do equipamento. Eventos manuais são sempre `granted`. |
| `denial_reason` | texto normalizado | Motivo da negação (autorização ausente, vencida, pessoa desconhecida, offline, falha de reconhecimento). |
| `attempt_id` | texto, opcional | Usado quando a pessoa não foi identificada, sem inventar identidade. |
| `recognition_method` | face, cartão, QR, senha ou outro | Vem do equipamento e é necessário para auditoria. |

Também é preciso uma tabela de equipamentos (`access_devices`), com fabricante, modelo, firmware, ponto de acesso associado, status e a credencial de integração. A credencial é guardada de forma cifrada e nunca aparece em tela ou log.

Para morador e proprietário, a regra de `access_events_target_xor` precisa ser revista. A decisão de incluir morador no registro de acesso deve ser tomada junto com o jurídico, porque muda o que é guardado sobre pessoas que não são visitantes.

## 3. Fluxo de recebimento

1. O equipamento envia ou disponibiliza o evento, pelo meio que o fabricante suportar (push, consulta ou exportação).
2. Um adaptador específico do fabricante lê o evento e o converte para o formato interno descrito no contrato (seção 2 de `contrato-acesso-facial.md`).
3. O CondoVia valida o evento: equipamento cadastrado, ponto correspondente, horário dentro de uma janela aceitável e campos obrigatórios presentes.
4. Antes de gravar, o sistema verifica a idempotência pelo par `device_id` e `external_event_id`. Se já existir, ignora sem erro.
5. Para entrada e saída, o sistema confere se a autorização está válida no momento do evento. Se o equipamento liberou e a autorização não estiver válida, o evento é gravado com a inconsistência marcada, e a portaria é avisada. A liberação não é desfeita pelo sistema, porque o equipamento já abriu a porta.
6. O evento é gravado e aparece na tela de presença.

Se o equipamento ficar fora do ar, a portaria registra a entrada manualmente, como prevê o contrato. Quando o equipamento voltar, os eventos que ele reenviar não duplicam os registros manuais, porque a origem e o horário são comparados.

## 4. Adaptadores por fabricante

O CondoVia não deve conhecer as particularidades de cada fabricante. A regra é:

- Uma interface única, com as operações: cadastrar pessoa, remover pessoa, sincronizar autorizações, consultar status do equipamento e receber eventos.
- Um adaptador por modelo ou família, responsável por traduzir essas operações para o protocolo do fabricante.
- Enquanto a documentação não chegar, os adaptadores existem só como contrato, sem implementação real.

Adaptadores previstos:
- Intelbras SS 3532 MF.
- Hikvision DS-K1T671MF e DS-K1T673DX-BR (família de leitores faciais).
- Hikvision iDS-TCM403-BI (leitor de placas). Como é leitor de veículos, pode ficar fora da primeira versão, se o piloto for só pedestres.

## 5. Teste sem equipamento real

Um simulador de equipamento, que roda no ambiente de teste, gera eventos no formato interno. Ele serve para testar:
- entrada e saída de visitante com autorização válida;
- entrada com autorização vencida, que deve ser gravada como inconsistente;
- tentativa negada, com e sem pessoa identificada;
- o mesmo evento enviado duas vezes, que não pode duplicar;
- equipamento fora do ar e volta com reenvio de eventos;
- evento com horário fora de ordem;
- equipamento desconhecido, que deve ser rejeitado.

Esses casos viram testes automatizados. Eles não dependem de nenhum fabricante, então podem ser feitos antes da resposta.

## 6. O que depende de decisão ou de fornecedor

Decisão interna:
- incluir morador e proprietário no registro de acesso, ou manter só visitante e prestador por enquanto;
- o que fazer com a liberação já feita quando a autorização estava vencida;
- se o piloto começa só com pedestres.

Depende do jurídico (P11):
- base legal para foto e rosto;
- o que é guardado de tentativas negadas de pessoas não identificadas.

Depende do fornecedor:
- formato real dos eventos e forma de entrega (push, consulta ou exportação);
- autenticação e credencial de integração;
- versão de firmware compatível com cada modelo;
- se o QR Code é validado no aparelho ou no sistema.

## 7. Próximos passos sem depender do fornecedor

1. Revisar este documento e decidir os pontos da seção 6 que são internos.
2. Escrever a migration de `access_devices` e os campos novos, em branch separada, para revisão.
3. Implementar o simulador e os testes da seção 5.
4. Implementar a interface de adaptador, com um adaptador de simulação.
5. Aguardar a documentação dos fabricantes para escrever os adaptadores reais.
