import { PrismaClient } from "@prisma/client";
import { computeTAT } from "../lib/tat";

const db = new PrismaClient();

async function main() {
  const cases = await db.case.findMany({
    where: { investigationStatus: { not: "CLOSED" } },
  });
  let updated = 0;
  for (const c of cases) {
    const tat = computeTAT({
      complaintDate: c.complaintDate,
      closureDate: c.closureDate,
      severity: c.severity,
    });
    if (
      c.tatDays !== tat.tatDays ||
      c.caseAge !== tat.caseAge ||
      c.tatBreach !== tat.tatBreach
    ) {
      await db.case.update({
        where: { id: c.id },
        data: { tatDays: tat.tatDays, caseAge: tat.caseAge, tatBreach: tat.tatBreach },
      });
      updated++;
    }
  }
  console.log(`TAT scan: ${cases.length} open cases inspected, ${updated} updated.`);
}

main().then(() => db.$disconnect()).catch((e) => {
  console.error(e);
  process.exit(1);
});
