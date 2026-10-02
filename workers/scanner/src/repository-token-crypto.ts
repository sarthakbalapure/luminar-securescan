import { createDecipheriv, createHash } from "crypto";

export function decryptSensitiveToken(ciphertext: string) {
  const secret = process.env.SENSITIVE_TOKEN_ENCRYPTION_KEY ?? process.env.REPOSITORY_TOKEN_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) throw new Error("SENSITIVE_TOKEN_ENCRYPTION_KEY, REPOSITORY_TOKEN_ENCRYPTION_KEY, or JWT_SECRET is required to run token-backed scans.");

  const [version, ivValue, tagValue, ciphertextValue] = ciphertext.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Sensitive token payload is invalid.");
  }

  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export const decryptRepositoryToken = decryptSensitiveToken;
