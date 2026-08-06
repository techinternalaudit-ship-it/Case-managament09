import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { hashPassword } from "../lib/password";

const db = new PrismaClient();

/**
 * Seeded accounts must never ship with a guessable password. Uses SEED_PASSWORD
 * when provided, otherwise generates a random one and prints it once — there is
 * no way to recover it afterwards, only to reset it from the admin screen.
 */
function resolveSeedPassword(): { password: string; generated: boolean } {
  const fromEnv = process.env.SEED_PASSWORD;
  if (fromEnv) return { password: fromEnv, generated: false };
  // 24 base64url chars: mixed case, digits, and a symbol appended to satisfy policy.
  const random = crypto.randomBytes(18).toString("base64url").slice(0, 20);
  return { password: `${random}#Aa1`, generated: true };
}

const CATEGORIES: Record<string, string[]> = {
  "Employee Fraud": [
    "Mis-selling",
    "Loan without consent",
    "Bribery",
    "Fradulent Fund Transfer - siphoning of loan funds",
    "Fradulent Fund Transfer from Merchant account",
    "Mediclaim Fraud",
    "Identity Concealment",
    "Ghost Employee",
    "Reimbursement Fraud",
    "DLP Issue - Data Leakage/ Sharing confidential information to self or external parties",
    "Others",
  ],
  "Employee Mis-conduct": [
    "Funds taken from Merchant - with Consent",
    "COC Violation - Dual Employment",
    "COC Violation - Undisclosed Business Interests",
    "COC Violation - Undisclosed Relationships (Friends, Family, Romantic, Supplier)",
    "Gross violation/Negligence",
    "Others",
  ],
  "Employee Concerns": [
    "PIP Related Allegation",
    "Salary/F&F Related Issue",
    "Decorum - Physical Abuse",
    "Decorum - Verbal Abuse & Unprofessional Conduct",
    "Decorum - Unprofessional Conduct",
    "Toxic Work Enviromnent",
    "Harrasment",
    "Others",
  ],
};

async function main() {
  // Lookups
  for (const [cat, subs] of Object.entries(CATEGORIES)) {
    const c = await db.lookupCategory.upsert({
      where: { name: cat },
      create: { name: cat },
      update: {},
    });
    for (const sub of subs) {
      await db.lookupSubCategory.upsert({
        where: { categoryId_name: { categoryId: c.id, name: sub } },
        create: { name: sub, categoryId: c.id },
        update: {},
      });
    }
  }

  // Users
  const seed = resolveSeedPassword();
  const seedHash = hashPassword(seed.password);
  const hash = (_pw: string) => seedHash;

  const users = [
    {
      email: "ruchika@vigilance.local",
      name: "Ruchika",
      passwordHash: hash("password"),
      role: "ADMIN",
      roles: "ADMIN,REVIEWER_L2",
      employeeCode: "ADM001",
      entity: "OCL",
    },
    {
      email: "julie@vigilance.local",
      name: "Julie",
      passwordHash: hash("password"),
      role: "INVESTIGATOR",
      roles: "INVESTIGATOR",
      employeeCode: "INV001",
      entity: "OCL",
    },
    {
      email: "sakshi@vigilance.local",
      name: "Sakshi",
      passwordHash: hash("password"),
      role: "INVESTIGATOR",
      roles: "INVESTIGATOR",
      employeeCode: "INV002",
      entity: "OCL",
    },
    {
      email: "ankita@vigilance.local",
      name: "Ankita",
      passwordHash: hash("password"),
      role: "INVESTIGATOR",
      roles: "INVESTIGATOR",
      employeeCode: "INV003",
      entity: "OCL",
    },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      // Seeded credentials are shared, so every account must set its own on first use.
      create: { ...u, passwordChangedAt: new Date(), mustChangePassword: true },
      update: {},
    });
  }

  if (seed.generated) {
    console.log(`
${"=".repeat(64)}
  Seeded accounts were given a RANDOM password. Save it now — it is
  not stored anywhere and cannot be recovered, only reset by an admin.

      password: ${seed.password}

  Every seeded account must change it on first sign-in.
${"=".repeat(64)}
`);
  } else {
    console.log("Seeded accounts use the password from SEED_PASSWORD.");
  }

  // App settings
  await db.appSetting.upsert({
    where: { key: "sla_days_default" },
    create: { key: "sla_days_default", value: "30" },
    update: {},
  });

  // Remove legacy users no longer in use
  const legacyEmails = [
    "admin@vigilance.local",
    "raina@vigilance.local",
    "selena@vigilance.local",
    "sakira@vigilance.local",
    "reviewer@vigilance.local",
    "hrbp.ocl@vigilance.local",
  ];
  const legacyUsers = await db.user.findMany({ where: { email: { in: legacyEmails } }, select: { id: true } });
  const legacyIds = legacyUsers.map((u) => u.id);
  if (legacyIds.length) {
    await db.case.updateMany({ where: { assigneeId: { in: legacyIds } }, data: { assigneeId: null } });
    await db.case.updateMany({ where: { createdById: { in: legacyIds } }, data: { createdById: (await db.user.findFirst({ where: { email: "ruchika@vigilance.local" } }))!.id } });
  }
  await db.user.deleteMany({ where: { email: { in: legacyEmails } } });

  console.log("✅ Seed complete. Accounts (all share the password above):");
  console.log("   ruchika@vigilance.local  — Admin, Reviewer L2");
  console.log("   julie@vigilance.local    — Investigator");
  console.log("   sakshi@vigilance.local   — Investigator");
  console.log("   ankita@vigilance.local   — Investigator");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
