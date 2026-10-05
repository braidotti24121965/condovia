export type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

export function reservationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("já está reservado") || message.includes("Já existe uma reserva nesse período") || message.includes("23P01")) return "Já existe uma reserva nesse período.";
  if (message.includes("disponibilidade semanal")) return "O horário informado está fora da disponibilidade do recurso.";
  if (message.includes("antecedência")) return "A antecedência informada está fora das regras do recurso.";
  if (message.includes("duração")) return "A duração informada está fora das regras do recurso.";
  if (message.includes("Recurso ou usuário") || message.includes("Unidade inválida")) return "Não foi possível validar os dados da reserva.";
  return "Não foi possível criar a reserva. Tente novamente.";
}
