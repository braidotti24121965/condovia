const readinessMessages: Record<string, string> = {
  "Checklist obrigatório incompleto": "Conclua e salve todos os itens obrigatórios do checklist antes de enviar para validação ou concluir a OS.",
  "Aprovação financeira pendente para o valor e revisão atuais": "Solicite e obtenha a aprovação financeira do valor e da revisão atuais antes de continuar.",
  "Prestador inativo": "Selecione um prestador ativo antes de continuar.",
  "Este serviço exige contrato": "Vincule um contrato ao tipo de serviço antes de continuar.",
  "Contrato fora de vigência ou incompatível": "Vincule um contrato vigente e compatível com o fornecedor da OS.",
  "Documentação obrigatória ausente": "Anexe a documentação obrigatória do serviço antes de continuar.",
  "Registre o custo efetivo antes da conclusão": "Registre e salve o custo efetivo antes de enviar para validação ou concluir a OS.",
  "Responsável inválido para este condomínio": "Selecione um responsável ativo e autorizado para este condomínio.",
  "Permissão negada": "Você não tem permissão para realizar esta ação na OS.",
  "OS inacessível": "A OS não está disponível no contexto atual. Atualize a lista e tente novamente.",
};

export function orderTransitionError(message: string, action: string): string {
  if (readinessMessages[message]) return readinessMessages[message];
  if (message === "Transição inválida ou motivo ausente") {
    if (action === "submit_validation") return "Preencha e salve as atividades executadas e a conclusão técnica, com pelo menos 3 caracteres em cada campo, e confira se a OS está em execução.";
    if (action === "cancel") return "Informe um motivo com pelo menos 3 caracteres e confira se a OS ainda está aberta, atribuída, em execução ou aguardando validação.";
    if (action === "assign") return "Selecione um responsável e confira se a OS está aberta antes de atribuir.";
    if (action === "start") return "A OS precisa estar atribuída antes de iniciar a execução. Atualize a tela e confira o status.";
    if (action === "validate") return "A OS precisa estar aguardando validação antes de ser concluída. Atualize a tela e confira o status.";
  }
  return "Não foi possível atualizar a ordem de serviço. Tente novamente.";
}
