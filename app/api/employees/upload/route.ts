import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

// Column header → field mapping
const COL_MAP: Record<string, string> = {
  "EMPLOYEECODE": "eCode",
  "Employee Name": "name",
  "Title": "title",
  "Gender": "gender",
  "Official Email Address": "email",
  "Entity": "entity",
  "Grade": "grade",
  "Designation": "designation",
  "Department": "department",
  "Sub Department": "subDepartment",
  "Function": "function",
  "BU": "bu",
  "SBU": "sbu",
  "Segment": "segment",
  "Office City": "city",
  "State": "state",
  "Office Location": "location",
  "Employment Status": "employmentStatus",
  "Employment Type": "employmentType",
  "Role Category": "roleCategory",
  "Role": "role",
  "Employee Type": "employeeType",
  "L1 Manager Code": "l1ManagerCode",
  "L1 Manager Name": "l1ManagerName",
  "L2 Manager Code": "l2ManagerCode",
  "L2 Manager Name": "l2ManagerName",
  "HRBP Code": "hrbpCode",
  "HRBP Name": "hrbpName",
  "HR SPOC Code": "hrSpocCode",
  "HR SPOC Name": "hrSpocName",
  "HOD Code": "hodCode",
  "Mobile Number": "mobileNumber",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Accessible to all logged-in users

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    // Map columns to our schema fields
    const employees: Record<string, string>[] = [];
    let skipped = 0;

    for (const raw of rawRows) {
      const mapped: Record<string, string> = {};
      for (const [excelCol, dbField] of Object.entries(COL_MAP)) {
        const val = raw[excelCol];
        if (val !== undefined && val !== null && val !== "") {
          mapped[dbField] = String(val).trim();
        }
      }
      // eCode is required
      if (!mapped.eCode) { skipped++; continue; }
      employees.push(mapped);
    }

    // Chunked truncate & reload in transaction
    const CHUNK = 500;

    // Delete all existing employees first
    await db.employee.deleteMany();

    // Insert in chunks
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
          city: e.city || null,
          state: e.state || null,
          location: e.location || null,
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
        })),
      });
    }

    // Log the upload with who did it
    await db.employeeUploadLog.create({
      data: {
        filename: file.name,
        rowCount: employees.length,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      imported: employees.length,
      skipped,
      total: rawRows.length,
    });
  } catch (err) {
    console.error("Employee upload error:", err);
    return NextResponse.json({ error: "Import failed. Check file format." }, { status: 500 });
  }
}
