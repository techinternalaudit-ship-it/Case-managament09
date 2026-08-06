import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes a user with a pending forced password change is still allowed to reach.
 * Without /profile they could not complete the change; without /api/auth they
 * could not sign out.
 */
const ALLOWED_WHILE_LOCKED = ["/profile", "/api/auth", "/sign-in"];

/**
 * Forces users whose password was set by an admin to replace it before they can
 * reach any case data. Reads the claim straight off the signed session JWT so
 * this stays Edge-safe — no Prisma or bcrypt import.
 *
 * The claim is written at sign-in only. `changeOwnPassword` signs the user out
 * on success, so the next sign-in issues a token with the flag cleared and the
 * claim can never go stale.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ALLOWED_WHILE_LOCKED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    salt: process.env.AUTH_URL?.startsWith("https")
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  if (token?.mustChangePassword) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?mustChangePassword=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static assets; guard every real page and API route.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
