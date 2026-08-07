import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { verifyPassword } from "./password";
import { clientIp } from "./rate-limit";

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
    };
  }
  interface User {
    role: string;
    roles: string;
    scopeEntity?: string | null;
    scopeDept?: string | null;
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

        const ok = await verifyPassword(password, user.passwordHash);

        if (!ok) {
          await logAttempt({ email, success: false, reason: "BAD_PASSWORD", headers });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
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
      }
      return token;
    },
    session: async ({ session, token }) => {
      const t = token as unknown as { uid: string; role: string; roles: string; scopeEntity?: string | null; scopeDept?: string | null };
      session.user.id = t.uid;
      session.user.role = t.role;
      session.user.roles = t.roles;
      session.user.scopeEntity = t.scopeEntity;
      session.user.scopeDept = t.scopeDept;
      return session;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}
