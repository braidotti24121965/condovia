export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const digits = normalizeDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calculate = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidBrazilianPhone(value: string) {
  const digits = normalizeDigits(value).replace(/^55/, "");
  return (digits.length === 10 || digits.length === 11) && digits[2] !== "0";
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validatePersonFields(fields: { fullName: string; preferredName?: string; birthDate?: string; cpf?: string; email?: string; phone?: string }) {
  const errors: Record<string, string> = {};
  if (fields.fullName.trim().length < 2) errors.full_name = "Informe o nome completo.";
  if (fields.preferredName && fields.preferredName.trim().length < 2) errors.preferred_name = "Informe um nome preferencial válido.";
  if (fields.birthDate && !isValidIsoDate(fields.birthDate)) errors.birth_date = "Informe uma data de nascimento válida.";
  if (fields.cpf && !isValidCpf(fields.cpf)) errors.cpf = "Informe um CPF válido.";
  if (fields.email && !isValidEmail(fields.email)) errors.email = "Informe um e-mail válido.";
  if (fields.phone && !isValidBrazilianPhone(fields.phone)) errors.phone = "Informe um telefone válido com DDD.";
  return errors;
}
