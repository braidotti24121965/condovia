/**
 * Utilitários para conversão e formatação de datas e horários
 * respeitando o fuso horário (IANA timezone) do condomínio.
 */

/**
 * Converte uma string no formato 'YYYY-MM-DDTHH:mm' (proveniente de input type="datetime-local")
 * para um objeto Date (instante temporal absoluto / UTC), interpretando a data/hora
 * no fuso horário especificado.
 */
export function parseDateTimeInTimezone(dateTimeStr: string, timeZone: string): Date {
  const trimmed = dateTimeStr.trim();
  const [datePart, timePart] = trimmed.split("T");
  if (!datePart || !timePart) {
    throw new Error(`Formato de data/hora inválido: ${dateTimeStr}`);
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    throw new Error(`Valores numéricos de data/hora inválidos: ${dateTimeStr}`);
  }

  let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Itera duas vezes para convergência exata (inclusive transições de horário de verão)
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(dtf.formatToParts(utcGuess).map((p) => [p.type, p.value]));
    const formattedHour = parts.hour === "24" ? 0 : Number(parts.hour);
    const tzDate = new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        formattedHour,
        Number(parts.minute),
        Number(parts.second)
      )
    );
    const offset = tzDate.getTime() - utcGuess.getTime();
    utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset);
  }

  return utcGuess;
}

/**
 * Formata um instante UTC/Date para exibição em pt-BR no fuso horário do condomínio.
 * Ex: "05/10/2026, 14:53"
 */
export function formatDateTimeInTimezone(
  date: Date | string,
  timeZone: string = "America/Sao_Paulo"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Formata a janela de uma autorização no fuso horário do condomínio.
 * Ex: "16:00 até 18:00"
 */
export function formatAuthorizationWindowInTimezone(
  validFrom: Date | string,
  validUntil: Date | string,
  timeZone: string = "America/Sao_Paulo"
): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(validFrom))} até ${formatter.format(new Date(validUntil))}`;
}

/**
 * Converte um objeto Date para o formato padrão do input datetime-local ('YYYY-MM-DDTHH:mm')
 * no fuso horário especificado.
 */
export function toLocalDateTimeInput(
  date: Date = new Date(),
  timeZone: string = "America/Sao_Paulo"
): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const formattedHour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${formattedHour}:${parts.minute}`;
}

export type AuthorizationOperationalStatus = {
  code: "active" | "scheduled" | "expired";
  label: "Ativa" | "Agendada" | "Expirada";
  tone: "active" | "info" | "inactive";
};

/**
 * Determina o status operacional da autorização a partir dos instantes temporais reais:
 * - agora < valid_from: Agendada (futura)
 * - valid_from <= agora <= valid_until: Ativa
 * - agora > valid_until: Expirada
 */
export function getAuthorizationOperationalStatus(
  validFrom: Date | string,
  validUntil: Date | string,
  now: Date | string = new Date()
): AuthorizationOperationalStatus {
  const from = typeof validFrom === "string" ? new Date(validFrom) : validFrom;
  const until = typeof validUntil === "string" ? new Date(validUntil) : validUntil;
  const current = typeof now === "string" ? new Date(now) : now;

  if (current < from) {
    return { code: "scheduled", label: "Agendada", tone: "info" };
  }
  if (current > until) {
    return { code: "expired", label: "Expirada", tone: "inactive" };
  }
  return { code: "active", label: "Ativa", tone: "active" };
}

/**
 * Retorna os limites UTC de início e fim do dia corrente em um determinado fuso horário.
 */
export function getDayBoundsInTimezone(
  timeZone: string = "America/Sao_Paulo",
  now: Date = new Date()
): { startOfDayUtc: string; endOfDayUtc: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = dtf.format(now); // "YYYY-MM-DD"
  const startOfDay = parseDateTimeInTimezone(`${todayStr}T00:00`, timeZone);
  const endOfDay = new Date(parseDateTimeInTimezone(`${todayStr}T23:59`, timeZone).getTime() + 59_999);

  return {
    startOfDayUtc: startOfDay.toISOString(),
    endOfDayUtc: endOfDay.toISOString(),
  };
}
