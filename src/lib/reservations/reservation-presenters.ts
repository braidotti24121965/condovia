import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";

export type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ReservationMode = "day" | "time_slot";

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

export function formatReservationSchedule(mode: ReservationMode, startsAt: string, endsAt: string, timeZone: string) {
  return mode === "day" ? "Dia inteiro" : `${formatDateTimeInTimezone(startsAt, timeZone).split(", ")[1]}–${formatDateTimeInTimezone(endsAt, timeZone).split(", ")[1]}`;
}

export function formatReservationMinutes(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} ${minutes === 1440 ? "dia" : "dias"}`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"}`;
  return `${minutes} minutos`;
}

export function reservationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("não pode começar no passado")) return "Não é possível realizar uma reserva para uma data ou horário anterior ao momento atual.";
  if (message.includes("término deve ser posterior")) return "O horário de término deve ser posterior ao horário de início.";
  if (message.includes("maior antecedência")) return "Esta reserva precisa ser solicitada com maior antecedência.";
  if (message.includes("muito distante")) return message;
  if (message.includes("duração mínima")) return message;
  if (message.includes("duração máxima")) return message;
  if (message.includes("já está reservado") || message.includes("Já existe uma reserva nesse período") || message.includes("23P01")) return "Já existe uma reserva nesse período.";
  if (message.includes("disponibilidade") || message.includes("período de disponibilidade")) return "O horário selecionado está fora do período de disponibilidade deste recurso.";
  if (message.includes("antecedência")) return "A antecedência informada está fora das regras do recurso.";
  if (message.includes("duração")) return "A duração informada está fora das regras do recurso.";
  if (message.includes("Recurso ou usuário") || message.includes("Unidade inválida")) return "Não foi possível validar os dados da reserva.";
  return "Não foi possível criar a reserva. Tente novamente.";
}
