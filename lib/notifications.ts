import { db } from "@/lib/db";
import { sendNotification } from "@/lib/mailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Helpers ─────────────────────────────────────────────────────────────

async function getCaseOrThrow(caseId: string) {
  const c = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    select: {
      id: true,
      caseNo: true,
      subjectLine: true,
      assigneeId: true,
      severity: true,
      investigationStatus: true,
    },
  });
  return c;
}

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

async function getUsersByRole(role: string): Promise<{ id: string; email: string }[]> {
  const users = await db.user.findMany({
    where: { active: true },
    select: { id: true, email: true, roles: true, role: true },
  });

  return users.filter(
    (u) =>
      u.role === role ||
      u.roles
        .split(",")
        .map((r) => r.trim())
        .includes(role),
  );
}

function caseUrl(caseId: string): string {
  return `${APP_URL}/cases/${caseId}`;
}

// ── Notification functions ──────────────────────────────────────────────

export async function notifyCaseAssigned(
  caseId: string,
  assigneeId: string,
): Promise<void> {
  try {
    const [c, email] = await Promise.all([
      getCaseOrThrow(caseId),
      getUserEmail(assigneeId),
    ]);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} assigned to you`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `A new case has been assigned to you for investigation.<br><br><strong>Severity:</strong> ${c.severity}<br><strong>Subject:</strong> ${c.subjectLine}<br><br>Please review the case details and begin your investigation at your earliest convenience.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyCaseAssigned failed:", err);
  }
}

export async function notifySubmittedForL1(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    const reviewers = await getUsersByRole("REVIEWER_L1");
    if (reviewers.length === 0) return;

    await Promise.all(
      reviewers.map((r) =>
        sendNotification({
          to: r.email,
          subject: `Case #${c.caseNo} submitted for L1 review`,
          caseNo: c.caseNo,
          caseName: c.subjectLine,
          body: `An investigation report for Case #${c.caseNo} has been submitted and is awaiting your L1 review.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><strong>Severity:</strong> ${c.severity}<br><br>Please review the report and provide your approval or feedback.`,
          actionUrl: caseUrl(caseId),
        }),
      ),
    );
  } catch (err) {
    console.error("[notifications] notifySubmittedForL1 failed:", err);
  }
}

export async function notifyL1Approved(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    const reviewers = await getUsersByRole("REVIEWER_L2");
    if (reviewers.length === 0) return;

    await Promise.all(
      reviewers.map((r) =>
        sendNotification({
          to: r.email,
          subject: `Case #${c.caseNo} approved by L1 -- awaiting L2 review`,
          caseNo: c.caseNo,
          caseName: c.subjectLine,
          body: `Case #${c.caseNo} has passed L1 review and is now pending your L2 review.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><strong>Severity:</strong> ${c.severity}<br><br>Please review the case and the L1 reviewer's comments at your earliest convenience.`,
          actionUrl: caseUrl(caseId),
        }),
      ),
    );
  } catch (err) {
    console.error("[notifications] notifyL1Approved failed:", err);
  }
}

export async function notifyL1Rejected(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    if (!c.assigneeId) return;

    const email = await getUserEmail(c.assigneeId);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} returned by L1 reviewer`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `Your investigation report for Case #${c.caseNo} has been returned by the L1 reviewer with feedback.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><br>Please review the comments, make the necessary revisions, and resubmit the report.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyL1Rejected failed:", err);
  }
}

export async function notifyL2Approved(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    if (!c.assigneeId) return;

    const email = await getUserEmail(c.assigneeId);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} approved and closed`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `Case #${c.caseNo} has been approved by the L2 reviewer and is now closed.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><strong>Status:</strong> Closed<br><br>No further action is required from you on this case. Thank you for your investigation.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyL2Approved failed:", err);
  }
}

export async function notifyL2Rejected(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    if (!c.assigneeId) return;

    const email = await getUserEmail(c.assigneeId);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} returned by L2 reviewer`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `Your investigation report for Case #${c.caseNo} has been returned by the L2 reviewer with feedback.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><br>Please review the L2 reviewer's comments, revise the report accordingly, and resubmit.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyL2Rejected failed:", err);
  }
}

export async function notifyTATBreachWarning(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    if (!c.assigneeId) return;

    const email = await getUserEmail(c.assigneeId);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} -- TAT breach in 7 days`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `Case #${c.caseNo} is approaching its Turn-Around-Time (TAT) deadline. The case will breach SLA in <strong>7 days</strong>.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><strong>Severity:</strong> ${c.severity}<br><br>Please prioritize completing the investigation and submitting the report to avoid a TAT breach.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyTATBreachWarning failed:", err);
  }
}

export async function notifyTATBreached(caseId: string): Promise<void> {
  try {
    const c = await getCaseOrThrow(caseId);
    if (!c.assigneeId) return;

    const email = await getUserEmail(c.assigneeId);
    if (!email) return;

    await sendNotification({
      to: email,
      subject: `Case #${c.caseNo} -- TAT breached`,
      caseNo: c.caseNo,
      caseName: c.subjectLine,
      body: `Case #${c.caseNo} has exceeded its Turn-Around-Time (TAT) SLA deadline.<br><br><strong>Subject:</strong> ${c.subjectLine}<br><strong>Severity:</strong> ${c.severity}<br><strong>Status:</strong> ${c.investigationStatus}<br><br>Immediate attention is required. Please complete the investigation and submit the report as soon as possible.`,
      actionUrl: caseUrl(caseId),
    });
  } catch (err) {
    console.error("[notifications] notifyTATBreached failed:", err);
  }
}
