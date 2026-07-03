import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "Vigilance <vigilance-noreply@paytm.com>";

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

// ── Low-level send ──────────────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!transporter) {
    console.log(
      `[mailer] SMTP_HOST not set — skipping email.\n  To: ${to}\n  Subject: ${subject}`,
    );
    return;
  }

  await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
}

// ── Branded notification wrapper ────────────────────────────────────────
export async function sendNotification({
  to,
  subject,
  caseNo,
  caseName,
  body,
  actionUrl,
}: {
  to: string;
  subject: string;
  caseNo: number;
  caseName: string;
  body: string;
  actionUrl?: string;
}): Promise<void> {
  const buttonHtml = actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 0">
        <tr>
          <td style="border-radius:6px;background-color:#1a73e8">
            <a href="${actionUrl}" target="_blank"
               style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;
                      color:#ffffff;text-decoration:none;border-radius:6px">
              View Case
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
               style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background-color:#0f1b3d;padding:24px 32px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px">
                    Vigilance
                  </td>
                  <td align="right" style="color:rgba(255,255,255,0.65);font-size:12px">
                    Case&nbsp;#${caseNo}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">
                ${caseName}
              </p>
              <h2 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#111827">
                ${subject}
              </h2>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151">
                ${body}
              </p>

              ${buttonHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
                This is an automated notification from the Paytm Vigilance Case Management System.
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  await sendEmail({ to, subject: `[Vigilance] ${subject}`, html });
}
