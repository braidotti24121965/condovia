import { describe, expect, it } from "vitest";
import { extractPassToken } from "./pass-token";

const TOKEN = "Ab3_dE-fGh1JkLmN0pQrStUvWxYz0123456789abcdE";

describe("extractPassToken", () => {
  it("accepts a bare token", () => {
    expect(extractPassToken(TOKEN)).toBe(TOKEN);
  });

  it("extracts the token from a full pass URL", () => {
    expect(extractPassToken(`https://condovia.kynovia.com.br/pass/${TOKEN}`)).toBe(TOKEN);
  });

  it("ignores query, hash and trailing slash around the URL", () => {
    expect(extractPassToken(`https://example.test/pass/${TOKEN}/?x=1#top`)).toBe(TOKEN);
  });

  it("trims surrounding whitespace", () => {
    expect(extractPassToken(`  ${TOKEN}\n`)).toBe(TOKEN);
  });

  it("rejects an authorization UUID, which is no longer a valid token", () => {
    expect(extractPassToken("f9a0c900-0000-4000-8000-000000000001")).toBeNull();
  });

  it("rejects tokens with the wrong length", () => {
    expect(extractPassToken("abc123")).toBeNull();
    expect(extractPassToken(TOKEN.slice(0, 42))).toBeNull();
    expect(extractPassToken(`${TOKEN}E`)).toBeNull();
  });

  it("rejects characters outside the base64url alphabet", () => {
    expect(extractPassToken(`${TOKEN}!!`)).toBeNull();
    expect(extractPassToken(`https://x.test/pass/${TOKEN}%20`)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractPassToken("   ")).toBeNull();
  });
});
