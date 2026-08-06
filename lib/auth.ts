import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { verifyPassword } from "./password";
import { clientIp, rateLimit } from "./rate-limit";

/** Failed attempts before the account is temporarily locked. */
const MAX_FAILED_ATTEMPTS = 5;
/** How long an account stays locked once the threshold is hit. */
const LOCKOUT_MINUTES = 15;
/** Per-IP sign-in attempts allowed per 15-minute window. */
const IP_ATTEMPT_LIMIT = 20;

/**
 * A real bcrypt hash of a random string. Compared against when the email is
 * unknown so that "no such user" costs the same time as "wrong password" and
 * cannot be distinguished by timing.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.NCFV2N7bXtxYvBn/6xVLxgTHMPsB2Ry";

async function logAttempt(args: {
  email: string;
  success: boolean;
  reason?: string;
  headers?: Headers;
}) {
  try {
    await db.loginAttempt.create({
      data: {
        email: args.email,
        success: args.success,
        reason: args.reason ?? null,
        ip: args.headers ? clientIp(args.headers) : null,
        userAgent: args.headers?.get("user-agent")?.slice(0, 255) ?? null,
      },
    });
  } catch {
    // Never let audit logging block or break a sign-in.
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      roles: string;
      scopeEntity?: string | null;
      scopeDept?: string | null;
      mustChangePassword?: boolean;
    };
  }
  interface User {
    role: string;
    roles: string;
    scopeEntity?: string | null;
    scopeDept?: string | null;
    mustChangePassword?: boolean;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Sessions expire after 8 hours rather than the 30-day default, so a stolen
    // token has a short useful life. Sliding: refreshed at most every 15 min.
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
  pages: { signIn: "/sign-in" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      async profile(profile) {
        const email = profile.email?.toLowerCase().trim();
        if (!email) return null as never;

        // Restrict to allowed domain if configured
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
          return null as never;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null as never;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: user.roles ?? user.role,
          scopeEntity: user.scopeEntity,
          scopeDept: user.scopeDept,
        };
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        const headers = request?.headers;
        if (!email || !password) return null;

        // Throttle by source IP so one host cannot spray many accounts.
        const ip = headers ? clientIp(headers) : null;
        if (ip && !rateLimit(`login:ip:${ip}`, IP_ATTEMPT_LIMIT, 15 * 60_000).allowed) {
          await logAttempt({ email, success: false, reason: "RATE_LIMITED", headers });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
          // Spend the same time as a real comparison to avoid user enumeration.
          await verifyPassword(password, DUMMY_HASH);
          await logAttempt({ email, success: false, reason: "NO_SUCH_USER", headers });
          return null;
        }
        if (!user.active) {
          await logAttempt({ email, success: false, reason: "INACTIVE", headers });
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAttempt({ email, success: false, reason: "LOCKED", headers });
          return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);

        if (!ok) {
          const attempts = user.failedLoginAttempts + 1;
          const lock = attempts >= MAX_FAILED_ATTEMPTS;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lock ? 0 : attempts,
              lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
            },
          });
          await logAttempt({
            email,
            success: false,
            reason: lock ? "LOCKED_OUT" : "BAD_PASSWORD",
            headers,
          });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await logAttempt({ email, success: true, headers });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: user.roles ?? user.role,
          scopeEntity: user.scopeEntity,
          scopeDept: user.scopeDept,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        // Restrict to allowed domain if configured
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
          return false;
        }

        const dbUser = await db.user.findUnique({ where: { email } });
        if (!dbUser || !dbUser.active) return false;
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { id: string; role: string; roles: string; scopeEntity?: string | null; scopeDept?: string | null };
        (token as Record<string, unknown>).uid = u.id;
        (token as Record<string, unknown>).role = u.role;
        (token as Record<string, unknown>).roles = (user as any).roles ?? (user as any).role ?? "";
        (token as Record<string, unknown>).scopeEntity = u.scopeEntity ?? null;
        (token as Record<string, unknown>).scopeDept = u.scopeDept ?? null;
        (token as Record<string, unknown>).mustChangePassword =
          (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const t = token as unknown as { uid: string; role: string; roles: string; scopeEntity?: string | null; scopeDept?: string | null; mustChangePassword?: boolean };
      session.user.id = t.uid;
      session.user.role = t.role;
      session.user.roles = t.roles;
      session.user.scopeEntity = t.scopeEntity;
      session.user.scopeDept = t.scopeDept;
      session.user.mustChangePassword = t.mustChangePassword ?? false;
      return session;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}
