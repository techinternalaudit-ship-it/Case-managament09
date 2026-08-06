"use server";

import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";

export async function changeOwnPassword(
  formData: FormData,
): Promise<{ error?: string; success?: boolean; signedOut?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "User not found." };

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const check = validatePassword(newPassword, { email: user.email, name: user.name });
  if (!check.ok) return { error: check.error };

  if (await verifyPassword(newPassword, user.passwordHash)) {
    return { error: "New password must be different from your current password." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    },
  });

  // Invalidate the current session: it carries a stale mustChangePassword claim,
  // and dropping it means a password change also revokes any other stolen copy
  // of the old token. The caller signs in again with the new password.
  await signOut({ redirect: false });

  revalidatePath("/profile");
  return { success: true, signedOut: true };
}
