// Tokens are 32 random bytes encoded as base64url: always 43 characters.
const PASS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Extracts a visitor pass token from a scanned QR payload or a pasted link.
 * Accepts the full pass URL (`https://.../pass/<token>`) or the bare token.
 * Returns null when the input does not contain a well-formed token.
 */
export function extractPassToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const marker = "/pass/";
  const markerIndex = trimmed.lastIndexOf(marker);
  const candidate =
    markerIndex >= 0
      ? trimmed.slice(markerIndex + marker.length).split(/[?#]/)[0].replace(/\/+$/, "")
      : trimmed;

  return PASS_TOKEN_PATTERN.test(candidate) ? candidate : null;
}
