type PersonRow = { preferred_name?: string | null; full_name?: string | null };
type ResponsibleRow = { people?: PersonRow | PersonRow[] | null };
type AssigneeRow = { user_account_id: string; display_name: string };

export function getResponsibleDisplayName(value: unknown): string | null {
  const account = Array.isArray(value) ? value[0] : value;
  if (!account || typeof account !== "object") return null;
  const personValue = (account as ResponsibleRow).people;
  const person = Array.isArray(personValue) ? personValue[0] : personValue;
  if (!person) return null;
  return person.preferred_name?.trim() || person.full_name?.trim() || null;
}

export function getAssigneeDisplayName(assignees: AssigneeRow[] | null | undefined, userAccountId: string | null | undefined): string | null {
  if (!userAccountId) return null;
  return assignees?.find((assignee) => assignee.user_account_id === userAccountId)?.display_name ?? null;
}
