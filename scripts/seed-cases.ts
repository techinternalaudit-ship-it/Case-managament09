import { PrismaClient } from "@prisma/client";
import { computeTAT } from "../lib/tat";

const db = new PrismaClient();

const ENTITIES = ["OCL", "PSPL", "PCL", "PFSL", "PML"];
const CITIES: Array<[string, string]> = [
  ["Noida", "UP"],
  ["Bengaluru", "Karnataka"],
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Hyderabad", "Telangana"],
  ["Chennai", "Tamil Nadu"],
  ["Delhi", "Delhi"],
  ["Gurugram", "Haryana"],
];
const DEPARTMENTS = ["Sales", "Operations", "Finance", "Technology", "HR", "Customer Support", "Risk"];
const CHANNELS = ["Employee Escalations", "Whistleblower Portal", "Email", "Helpline", "Walk-in", "Anonymous"];
const STATUSES: Array<{ key: string; closed?: boolean }> = [
  { key: "INVESTIGATION_NOT_STARTED" },
  { key: "INVESTIGATION_IN_PROGRESS" },
  { key: "DRAFT_REVIEW" },
  { key: "CLOSED_WITH_MHD", closed: true },
  { key: "CLOSED_WITH_HR_SPOC", closed: true },
  { key: "CLOSED", closed: true },
];

const RESPONDENTS = [
  "Amit Verma", "Priya Sharma", "Rohit Kumar", "Sneha Iyer", "Karan Mehta",
  "Anjali Singh", "Vikram Patel", "Divya Nair", "Manish Gupta", "Pooja Reddy",
  "Sanjay Joshi", "Neha Kapoor", "Rajesh Khanna", "Meera Pillai", "Arjun Rao",
  "Kavita Desai", "Suresh Babu", "Ritu Agarwal", "Deepak Saxena", "Lata Menon",
];

const SUBJECTS = [
  "Suspected mis-selling of insurance to merchant",
  "Unauthorized loan disbursement on customer account",
  "Sharing of confidential merchant data via personal email",
  "Bribery allegation by sales partner",
  "Conflict of interest with vendor relationship",
  "Reimbursement claim with falsified receipts",
  "Repeated dual-employment violation",
  "Verbal abuse complaint from team member",
  "Ghost employee on payroll roster",
  "Funds transferred from merchant account without consent",
  "Loan documentation forged in onboarding",
  "Toxic work environment in regional team",
  "Mediclaim submission with manipulated bills",
  "Harassment complaint against line manager",
  "Identity concealment during background verification",
  "Misuse of company credit card for personal travel",
  "Negligence in customer KYC validation",
  "Salary dispute escalated to vigilance",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(10, 0, 0, 0);
  return dt;
}
function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function main() {
  const investigators = await db.user.findMany({ where: { role: { in: ["INVESTIGATOR", "ADMIN"] } } });
  if (!investigators.length) throw new Error("Run main seed first — no investigators found");
  const admin = investigators.find((u) => u.role === "ADMIN") ?? investigators[0];

  const categories = await db.lookupCategory.findMany({ include: { subs: true } });
  if (!categories.length) throw new Error("Run main seed first — no categories found");

  const maxAgg = await db.case.aggregate({ _max: { caseNo: true } });
  let nextNo = (maxAgg._max.caseNo ?? 100000) + 1;
  if (nextNo < 100001) nextNo = 100001;

  const severities = ["LOW", "LOW", "MEDIUM", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL"];

  const created: number[] = [];
  for (let i = 0; i < 40; i++) {
    const cat = rand(categories);
    const sub = rand(cat.subs);
    const sev = rand(severities);
    const [city, state] = rand(CITIES);
    const entity = rand(ENTITIES);
    const dept = rand(DEPARTMENTS);
    const respondent = RESPONDENTS[i % RESPONDENTS.length];
    const subject = SUBJECTS[i % SUBJECTS.length];
    const assignee = rand(investigators);

    // Distribute case ages across last 90 days
    const ageDays = Math.floor(Math.random() * 90) + 2;
    const complaintDate = daysAgo(ageDays);
    const assignDate = daysAgo(Math.max(1, ageDays - 1));
    const status = rand(STATUSES);
    const isClosed = !!status.closed;
    const closureDate = isClosed ? daysAgo(Math.max(1, ageDays - Math.floor(Math.random() * Math.min(35, ageDays - 1)))) : null;

    const t = computeTAT({ complaintDate, closureDate, severity: sev });

    const substantiated = isClosed ? rand(["SUBSTANTIATED", "UNSUBSTANTIATED", "PARTIALLY_SUBSTANTIATED"]) : null;

    const caseNo = nextNo++;
    await db.case.create({
      data: {
        caseNo,
        escalationChannel: rand(CHANNELS),
        complaintDate,
        escalationDate: daysAgo(ageDays + 1),
        assignDate,
        month: monthLabel(complaintDate),
        severity: sev,
        assigneeId: Math.random() < 0.9 ? assignee.id : null,
        subjectLine: subject,
        complainantType: rand(["Employee", "Merchant", "Customer", "HR", "MHD", "Anonymous"]),
        complainantName: Math.random() < 0.7 ? rand(RESPONDENTS) : null,
        complainantEntity: rand(ENTITIES),
        respondentName: respondent,
        respondentECode: `E${10000 + Math.floor(Math.random() * 89999)}`,
        respondentEntity: entity,
        respondentGrade: rand(["L1", "L2", "L3", "L4", "L5"]),
        city,
        state,
        hrbpSpoc: "OCL HRBP",
        respondentDept: dept,
        saleNonSale: dept === "Sales" ? "Sale" : "Not Sale",
        categoryId: cat.id,
        subCategoryId: sub.id,
        investigationStatus: status.key,
        substantiated,
        closureDate,
        tatDays: t.tatDays,
        caseAge: t.caseAge,
        tatBreach: t.tatBreach,
        createdById: admin.id,
      },
    });
    created.push(caseNo);
  }

  console.log(`✅ Seeded ${created.length} cases:`, created.join(", "));
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
