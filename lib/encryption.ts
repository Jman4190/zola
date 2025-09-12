import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function resolveKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    try {
      const decoded = Buffer.from(envKey, "base64")
      if (decoded.length === 32) {
        return decoded
      }
    } catch {
      // fallthrough to error handling below
    }
  }

  // In development, fall back to an ephemeral key so the app can run.
  if (process.env.NODE_ENV !== "production") {
    const generated = randomBytes(32)
    // eslint-disable-next-line no-console
    console.warn(
      envKey
        ? "[encryption] ENCRYPTION_KEY is invalid. Using ephemeral dev key."
        : "[encryption] ENCRYPTION_KEY not set. Using ephemeral dev key."
    )
    return generated
  }

  throw new Error(
    "ENCRYPTION_KEY must be set to a base64-encoded 32-byte key (AES-256)."
  )
}

const key = resolveKey()

export function encryptKey(plaintext: string): {
  encrypted: string
  iv: string
} {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()
  const encryptedWithTag = encrypted + ":" + authTag.toString("hex")

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedData: string, ivHex: string): string {
  const [encrypted, authTagHex] = encryptedData.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export function maskKey(key: string): string {
  if (key.length <= 8) {
    return "*".repeat(key.length)
  }
  return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4)
}
