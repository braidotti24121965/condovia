/**
 * Description saved on a work order. The complement typed in the request-based form wins;
 * when it is empty, the approved request's own description (or title) is used, so the
 * work order is never saved without text.
 */
export function workOrderDescription(
  complement: string,
  request: { title: string; description: string | null } | null,
): string {
  const typed = complement.trim();
  if (typed) return typed;
  if (!request) return "";
  return (request.description ?? "").trim() || request.title.trim();
}
