const PBKDF2_ITERATIONS = 310000;
const HASH_LENGTH = 32;

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const hash = new Uint8Array(derivedBits);

  return [
    "pbkdf2",
    "sha256",
    PBKDF2_ITERATIONS,
    toBase64(salt),
    toBase64(hash)
  ].join("$");
}

export async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 5) return false;

    const [algorithm, hashName, iterations, saltBase64, hashBase64] = parts;

    if (algorithm !== "pbkdf2" || hashName !== "sha256") {
      return false;
    }

    const salt = fromBase64(saltBase64);
    const expectedHash = fromBase64(hashBase64);
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: Number(iterations),
        hash: "SHA-256"
      },
      keyMaterial,
      HASH_LENGTH * 8
    );

    const actualHash = new Uint8Array(derivedBits);

    return constantTimeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
