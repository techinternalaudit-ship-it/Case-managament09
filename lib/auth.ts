import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

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
  session: { strategy: "jwt" },
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
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
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
