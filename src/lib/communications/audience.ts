export type CommunicationDraft = {
  title: string;
  body: string;
  structureId: string | null;
};

export type CommunicationError = "title" | "body" | null;

/** Validates the text of a communication. Titles and bodies are trimmed before checking length. */
export function validateCommunication(draft: CommunicationDraft): CommunicationError {
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (title.length < 3 || title.length > 160) return "title";
  if (body.length < 3 || body.length > 5000) return "body";
  return null;
}

/** A communication with no structure is for the whole condominium; otherwise it targets one structure. */
export function reachesUnit(communicationStructureId: string | null, unitStructureId: string): boolean {
  return communicationStructureId === null || communicationStructureId === unitStructureId;
}
