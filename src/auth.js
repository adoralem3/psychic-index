const PBKDF2_ITERATIONS = 310000;
const HASH_LENGTH = 32;
const SESSION_DAYS = 7;

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

  return [
    "pbkdf2",
    "sha256",
    PBKDF2_ITERATIONS,
    toBase64(salt),
    toBase64(new Uint8Array(derivedBits))
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

    return constantTimeEqual(
      new Uint8Array(derivedBits),
      expectedHash
    );
  } catch {
    return false;
  }
}

async function hashSessionToken(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64(new Uint8Array(digest));
}

export async function createSession(env, adminId) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64(tokenBytes);

  const tokenHash = await hashSessionToken(token);

  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SESSION_DAYS * 24 * 60 * 60;

  await env.DB.prepare(
    `INSERT INTO sessions
      (token_hash, admin_id, expires_at)
     VALUES (?, ?, ?)`
  )
    .bind(tokenHash, adminId, expiresAt)
    .run();

  return {
    token,
    expiresAt
  };
}

export async function getSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";

  const match = cookie.match(
    /(?:^|;\s*)psychic_session=([^;]+)/
  );

  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  const tokenHash = await hashSessionToken(token);

  const session = await env.DB.prepare(
    `SELECT
       sessions.id,
       sessions.admin_id,
       sessions.expires_at,
       admins.email
     FROM sessions
     JOIN admins ON admins.id = sessions.admin_id
     WHERE sessions.token_hash = ?
       AND sessions.expires_at > ?
     LIMIT 1`
  )
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first();

  return session || null;
}

export async function deleteSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";

  const match = cookie.match(
    /(?:^|;\s*)psychic_session=([^;]+)/
  );

  if (!match) return;

  const token = decodeURIComponent(match[1]);
  const tokenHash = await hashSessionToken(token);

  await env.DB.prepare(
    "DELETE FROM sessions WHERE token_hash = ?"
  )
    .bind(tokenHash)
    .run();
}

export function sessionCookie(token, expiresAt) {
  return [
    `psychic_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Expires=${new Date(expiresAt * 1000).toUTCString()}`
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    "psychic_session=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}
