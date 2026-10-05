export function normalizeVisitorDocumentNumber(documentType: string | null, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return documentType?.toLowerCase() === "cpf" ? trimmed.replace(/\D/g, "") || null : trimmed;
}

export function hasDuplicateVisitorDocument(
  existing: Array<{ condominium_id: string; document_type: string | null; document_number: string | null }>,
  condominiumId: string,
  documentType: string | null,
  documentNumber: string
): boolean {
  const normalized = normalizeVisitorDocumentNumber(documentType, documentNumber);
  if (!normalized) return false;
  return existing.some(
    (visitor) =>
      visitor.condominium_id === condominiumId &&
      visitor.document_type?.toLowerCase() === documentType?.toLowerCase() &&
      normalizeVisitorDocumentNumber(visitor.document_type, visitor.document_number || "") === normalized
  );
}
