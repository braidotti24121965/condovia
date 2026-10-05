export type ResourceHourInput = { weekday: number; start_time: string; end_time: string; active: boolean };

export function validateResourceValues(values: { name: string; capacity: string; minimum_advance_minutes: string; maximum_advance_minutes: string; minimum_duration_minutes: string; maximum_duration_minutes: string; buffer_minutes: string; cancellation_deadline_minutes: string; usage_fee: string }) {
  const errors: Record<string, string> = {};
  if (values.name.trim().length < 2) errors.name = "Informe um nome válido.";
  for (const field of ["capacity", "minimum_advance_minutes", "maximum_advance_minutes", "minimum_duration_minutes", "maximum_duration_minutes", "buffer_minutes", "cancellation_deadline_minutes"] as const) {
    if (values[field] !== "" && (!Number.isInteger(Number(values[field])) || Number(values[field]) < 0)) errors[field] = "Informe um número inteiro maior ou igual a zero.";
  }
  if (values.capacity !== "" && Number(values.capacity) <= 0) errors.capacity = "A capacidade deve ser maior que zero.";
  if (values.usage_fee !== "" && (!Number.isFinite(Number(values.usage_fee)) || Number(values.usage_fee) < 0)) errors.usage_fee = "Informe um valor maior ou igual a zero.";
  if (values.minimum_advance_minutes && values.maximum_advance_minutes && Number(values.maximum_advance_minutes) < Number(values.minimum_advance_minutes)) errors.maximum_advance_minutes = "A antecedência máxima deve ser maior ou igual à mínima.";
  if (values.minimum_duration_minutes && values.maximum_duration_minutes && Number(values.maximum_duration_minutes) < Number(values.minimum_duration_minutes)) errors.maximum_duration_minutes = "A duração máxima deve ser maior ou igual à mínima.";
  return errors;
}

function timeMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }

export function validateResourceHours(hours: ResourceHourInput[]) {
  const errors: string[] = [];
  for (const hour of hours) if (hour.active && (!hour.start_time || !hour.end_time || timeMinutes(hour.start_time) >= timeMinutes(hour.end_time))) errors.push("Cada faixa ativa deve ter início anterior ao fim.");
  for (let i = 0; i < hours.length; i += 1) for (let j = i + 1; j < hours.length; j += 1) {
    const left = hours[i]; const right = hours[j];
    if (left.active && right.active && left.weekday === right.weekday && timeMinutes(left.start_time) < timeMinutes(right.end_time) && timeMinutes(left.end_time) > timeMinutes(right.start_time)) errors.push("As faixas do mesmo dia não podem se sobrepor.");
  }
  return [...new Set(errors)];
}
