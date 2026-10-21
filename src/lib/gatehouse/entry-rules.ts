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

/** Minimum time between two entry/exit records of the same pass, so one reading is never recorded twice. */
export const PASS_EVENT_COOLDOWN_SECONDS = 120;

/** Seconds still to wait before the same pass can record another event; 0 means it can. */
export function passEventCooldownRemaining(lastOccurredAt: string | null, now: Date = new Date()): number {
  if (!lastOccurredAt) return 0;
  const elapsed = (now.getTime() - new Date(lastOccurredAt).getTime()) / 1000;
  return elapsed >= PASS_EVENT_COOLDOWN_SECONDS ? 0 : Math.ceil(PASS_EVENT_COOLDOWN_SECONDS - elapsed);
}
