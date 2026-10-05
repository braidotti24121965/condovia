export function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "");
}

export function formatBrazilianPostalCode(value: string) {
  const digits = normalizePostalCode(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatBrazilianCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function validateBrazilianCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calculate = (base: string, weights: number[]) => {
    const sum = [...base].reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const second = calculate(digits.slice(0, 12) + first, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return digits.endsWith(`${first}${second}`);
}

export function friendlyDatabaseError(message?: string) {
  const value = message?.toLowerCase() ?? "";
  if (value.includes("sobrepor") || value.includes("mesma pessoa")) return "Já existe um período registrado para esta pessoa nesta unidade.";
  if (value.includes("excede 100")) return "A soma das participações ultrapassa 100% no período informado.";
  if (value.includes("não vinculada") || value.includes("não vinculado")) return "A pessoa deve estar vinculada e ativa neste condomínio.";
  if (value.includes("morador principal")) return "Já existe um morador principal neste período.";
  if (value.includes("responsável financeiro")) return "Já existe um responsável financeiro neste período.";
  if (value.includes("unidade inativa não aceita novos vínculos")) return "Unidade inativa não aceita novos vínculos.";
  if (value.includes("unidade em construção não aceita moradores")) return "Unidade em construção não aceita moradores.";
  if (value.includes("duplicate key") || value.includes("unique constraint")) return "Já existe uma unidade ou estrutura com este nome ou código neste contexto.";
  if (value.includes("cycle") || value.includes("parent") || value.includes("hierarchy")) return "Esta alteração criaria uma hierarquia inválida.";
  if (value.includes("inactive") || value.includes("active children")) return "Não é possível ativar ou inativar enquanto houver vínculos ativos incompatíveis.";
  if (value.includes("not authorized") || value.includes("permission denied")) return "Você não possui permissão para realizar esta operação.";
  if (value.includes("cnpj") || value.includes("timezone") || value.includes("check constraint")) return "Confira os dados informados e tente novamente.";
  return "Não foi possível salvar. Confira os dados e tente novamente.";
}

export function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  }

  return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}
