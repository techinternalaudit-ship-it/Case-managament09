"use server";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

export async function requestPasswordReset(userId: string): Promise<{ ok: boolean; alreadyPending?: boolean }> {
  if (!userId) return { ok: false };

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, active: true } });
  if (!user || !user.active) return { ok: false };

  // Check if there's already a pending request for this user
  const existing = await db.passwordResetRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existing) return { ok: true, alreadyPending: true };

  // Create request
  await db.passwordResetRequest.create({
    data: { userId },
  });

  // Notify all admins via email
  const admins = await db.user.findMany({
    where: { active: true },
    select: { email: true, roles: true, role: true },
  });
  const adminEmails = admins
    .filter((a) => a.role === "ADMIN" || a.roles.split(",").map((r) => r.trim()).includes("ADMIN"))
    .map((a) => a.email);

  if (adminEmails.length > 0) {
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7">
    <tr><td align="center" style="padding:32px 16px">
      <table width="480" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr><td style="background:#0f1b3d;padding:20px 28px;color:#fff;font-size:18px;font-weight:700">Vigilance</td></tr>
        <tr><td style="padding:28px">
          <h2 style="margin:0 0 16px;font-size:16px;color:#111827">Password Reset Request</h2>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">
            <strong>${user.name}</strong> (${user.email}) has requested a password reset.
          </p>
          <p style="margin:0;font-size:14px;color:#374151">
            Please go to <strong>Admin → Users</strong> to reset their password.
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">Paytm Vigilance Case Management System</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

    await Promise.all(
      adminEmails.map((to) =>
        sendEmail({ to, subject: `[Vigilance] Password reset request — ${user.name}`, html }),
      ),
    );
  }

  return { ok: true };
}
