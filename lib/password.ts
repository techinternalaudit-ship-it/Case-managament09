import bcrypt from "bcryptjs";

/**
 * Cost factor for bcrypt. 12 is the current sensible default — roughly 250ms
 * per hash on a small server, which is slow enough to make offline cracking of
 * a leaked hash expensive but fast enough for interactive sign-in.
 */
export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 6;

export type PasswordCheck = { ok: true } | { ok: false; error: string };

/**
 * Minimal password check — length only, by product decision. The complexity
 * rules, banned-word list and name/email checks were deliberately dropped so
 * simple shared passwords keep working. Tighten here to re-enable a policy;
 * every place that sets a password already routes through this function.
 */
export function validatePassword(
  password: string,
  _context: { email?: string | null; name?: string | null } = {},
): PasswordCheck {
  if (!password) return { ok: false, error: "Password is required." };

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password.length > 128) {
    return { ok: false, error: "Password must be 128 characters or fewer." };
  }

  return { ok: true };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
