type PersonRow = { preferred_name?: string | null; full_name?: string | null };
type ResponsibleRow = { people?: PersonRow | PersonRow[] | null };

export function getResponsibleDisplayName(value: unknown): string | null {
  const account = Array.isArray(value) ? value[0] : value;
  if (!account || typeof account !== "object") return null;
  const personValue = (account as ResponsibleRow).people;
  const person = Array.isArray(personValue) ? personValue[0] : personValue;
  if (!person) return null;
  return person.preferred_name?.trim() || person.full_name?.trim() || null;
}
