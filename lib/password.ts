import bcrypt from "bcryptjs";

/**
 * Cost factor for bcrypt. 12 is the current sensible default — roughly 250ms
 * per hash on a small server, which is slow enough to make offline cracking of
 * a leaked hash expensive but fast enough for interactive sign-in.
 */
export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 12;

/** Passwords that show up at the top of every breach corpus. */
const BANNED = new Set([
  "password", "password1", "password123", "passw0rd", "p@ssword", "p@ssw0rd",
  "admin", "admin123", "administrator", "letmein", "welcome", "welcome123",
  "qwerty", "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345",
  "iloveyou", "monkey", "dragon", "sunshine", "princess", "football",
  "abc123", "abcd1234", "changeme", "secret", "test123", "temp123",
  "paytm", "paytm123", "paytm@123", "vigilance", "vigilance123",
]);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

/**
 * Enforces the password policy. `context` holds strings the password must not
 * echo (name, email) — reusing your own email as a password is a common and
 * very guessable pattern.
 */
export function validatePassword(
  password: string,
  context: { email?: string | null; name?: string | null } = {},
): PasswordCheck {
  if (!password) return { ok: false, error: "Password is required." };

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password.length > 128) {
    return { ok: false, error: "Password must be 128 characters or fewer." };
  }

  const classes = [
    { re: /[a-z]/, label: "a lowercase letter" },
    { re: /[A-Z]/, label: "an uppercase letter" },
    { re: /[0-9]/, label: "a number" },
    { re: /[^a-zA-Z0-9]/, label: "a symbol" },
  ];
  const missing = classes.filter((c) => !c.re.test(password)).map((c) => c.label);
  if (missing.length) {
    return { ok: false, error: `Password must include ${missing.join(", ")}.` };
  }

  const lower = password.toLowerCase();

  if (BANNED.has(lower)) {
    return { ok: false, error: "That password is too common. Choose something less predictable." };
  }
  for (const banned of BANNED) {
    if (banned.length >= 6 && lower.includes(banned)) {
      return { ok: false, error: `Password must not contain the common word "${banned}".` };
    }
  }

  // Reject long runs of one character or trivial sequences.
  if (/(.)\1{3,}/.test(password)) {
    return { ok: false, error: "Password must not repeat the same character 4+ times in a row." };
  }

  const localPart = context.email?.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length >= 4 && lower.includes(localPart)) {
    return { ok: false, error: "Password must not contain your email address." };
  }
  for (const part of (context.name ?? "").toLowerCase().split(/\s+/)) {
    if (part.length >= 4 && lower.includes(part)) {
      return { ok: false, error: "Password must not contain your name." };
    }
  }

  return { ok: true };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
