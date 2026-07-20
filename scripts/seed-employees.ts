import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { resolve } from "path";

const db = new PrismaClient();

async function main() {
  const existing = await db.employee.count();
  if (existing > 0) {
    console.log(`⏭️  Employee master already has ${existing} records — skipping.`);
    return;
  }

  const gzPath = resolve(__dirname, "../prisma/employees-seed.json.gz");
  const buf = readFileSync(gzPath);
  const json = gunzipSync(buf).toString();
  const employees: Record<string, string>[] = JSON.parse(json);

  const CHUNK = 500;
  for (let i = 0; i < employees.length; i += CHUNK) {
    const chunk = employees.slice(i, i + CHUNK);
    await db.employee.createMany({
      data: chunk.map((e) => ({
        eCode: e.eCode,
        name: e.name || "Unknown",
        title: e.title || null,
        gender: e.gender || null,
        email: e.email || null,
        entity: e.entity || null,
        grade: e.grade || null,
        designation: e.designation || null,
        department: e.department || null,
        subDepartment: e.subDepartment || null,
        function: e.function || null,
        bu: e.bu || null,
        sbu: e.sbu || null,
        segment: e.segment || null,
        subSegment: e.subSegment || null,
        city: e.city || null,
        state: e.state || null,
        location: e.location || null,
        country: e.country || null,
        employmentStatus: e.employmentStatus || null,
        employmentType: e.employmentType || null,
        roleCategory: e.roleCategory || null,
        role: e.role || null,
        employeeType: e.employeeType || null,
        l1ManagerCode: e.l1ManagerCode || null,
        l1ManagerName: e.l1ManagerName || null,
        l2ManagerCode: e.l2ManagerCode || null,
        l2ManagerName: e.l2ManagerName || null,
        hrbpCode: e.hrbpCode || null,
        hrbpName: e.hrbpName || null,
        hrSpocCode: e.hrSpocCode || null,
        hrSpocName: e.hrSpocName || null,
        hodCode: e.hodCode || null,
        mobileNumber: e.mobileNumber || null,
        groupDoj: e.groupDoj || null,
        entityDoj: e.entityDoj || null,
        confirmationDate: e.confirmationDate || null,
        bizOpsCode: e.bizOpsCode || null,
        bizOpsName: e.bizOpsName || null,
        noticePeriod: e.noticePeriod || null,
        totalExperience: e.totalExperience || null,
        fatherName: e.fatherName || null,
        bloodGroup: e.bloodGroup || null,
        personalEmail: e.personalEmail || null,
        maritalStatus: e.maritalStatus || null,
        actualLwd: e.actualLwd || null,
        category: e.category || null,
        confirmationStatus: e.confirmationStatus || null,
        probationPeriod: e.probationPeriod || null,
        actualEmployment: e.actualEmployment || null,
        actualLocation: e.actualLocation || null,
        dateOfResignation: e.dateOfResignation || null,
        hrbpLeadCode: e.hrbpLeadCode || null,
        hrbpLeadName: e.hrbpLeadName || null,
        functionalManager: e.functionalManager || null,
        contractEndDate: e.contractEndDate || null,
      })),
    });
    process.stdout.write(".");
  }

  console.log(`\n✅ Seeded ${employees.length} employees from compressed seed file.`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
