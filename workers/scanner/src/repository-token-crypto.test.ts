import { createCipheriv, createHash, randomBytes } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptRepositoryToken } from "./repository-token-crypto";

describe("repository token crypto", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("decrypts repository tokens from encrypted queue payloads", () => {
    vi.stubEnv("REPOSITORY_TOKEN_ENCRYPTION_KEY", "test-secret");
    const token = "github-token-value";
    const key = createHash("sha256").update("test-secret").digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const payload = `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;

    expect(decryptRepositoryToken(payload)).toBe(token);
    expect(payload).not.toContain(token);
  });
});
