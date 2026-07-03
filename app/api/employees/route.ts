import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/employees?ecode=55952  — exact or prefix match
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ecode = req.nextUrl.searchParams.get("ecode")?.trim();
  if (!ecode || ecode.length < 2) return NextResponse.json([]);

  const employees = await db.employee.findMany({
    where: { eCode: { startsWith: ecode } },
    take: 5,
    select: {
      eCode: true,
      name: true,
      entity: true,
      grade: true,
      designation: true,
      department: true,
      subDepartment: true,
      city: true,
      state: true,
      hrbpName: true,
      hodCode: true,
      l1ManagerName: true,
      l2ManagerName: true,
      role: true,
      employeeType: true,
    },
  });

  // Resolve HOD name & entity from hodCode
  const hodCodes = employees.map((e) => e.hodCode).filter(Boolean) as string[];
  const hods = hodCodes.length
    ? await db.employee.findMany({
        where: { eCode: { in: hodCodes } },
        select: { eCode: true, name: true, entity: true },
      })
    : [];
  const hodMap = Object.fromEntries(hods.map((h) => [h.eCode, h]));

  const enriched = employees.map((e) => {
    const hod = e.hodCode ? hodMap[e.hodCode] : null;
    return {
      ...e,
      hodName: hod?.name ?? null,
      hodEntity: hod?.entity ?? null,
    };
  });

  return NextResponse.json(enriched);
}
