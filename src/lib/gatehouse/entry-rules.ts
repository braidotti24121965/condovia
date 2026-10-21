type PassLookup = {
  status: string;
  authorizationId?: string | null;
  alreadyInside?: boolean;
  operational?: { code: string };
};

/**
 * Decides whether a QR read by the camera may register the entry without a
 * confirmation click. Only a valid pass (active period, located authorization)
 * and an available access point qualify. Scheduled, expired or invalid passes
 * are never registered automatically.
 */
export function canAutoRegisterEntry(lookup: PassLookup, accessPointId: string): boolean {
  return (
    lookup.status === "found" &&
    !!lookup.authorizationId &&
    lookup.operational?.code === "active" &&
    !lookup.alreadyInside &&
    accessPointId !== ""
  );
}
