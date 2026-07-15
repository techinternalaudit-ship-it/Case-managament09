import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

const HEADERS = [
  "Case No.",
  "Escalation Channel",
  "Complaint Date",
  "Escalation Date",
  "Case Assign Date",
  "Month",
  "Severity",
  "Responsibility",
  "Case Subject Line",
  "Type of Complainant",
  "Name of Complainant",
  "Complainant E-Code",
  "Complainant Entity",
  "Complainant Grade",
  "Name of Respondent",
  "Respondent E-Code",
  "Respondent Entity",
  "Respondent Grade",
  "City",
  "State",
  "HRBP / HRSPOC of Respondent",
  "HOD of Respondent",
  "HOD Entity",
  "Department of Respondent",
  "Sale/Not - Sale",
  "Category",
  "Sub-Category",
  "Investigation Report Link",
  "Investigation Status",
  "Remarks 1",
  "Substantiated ( Yes or No)",
  "Report Status",
  "Closure Date",
  "Process Recommendation Approved by DC",
  "Employee Recommendation Approved by DC",
  "Employee Related Count",
  "Employee Related Action",
  "Employee Related Action Status",
  "Employee Action Implementation Date",
  "Process Related Action",
  "Process Related Action Status",
  "Process Action Implementation Date",
  "TAT (in days)",
  "Case Age",
  "Investigation TAT Breach",
  "Reason for Missing TAT",
  "Remarks 2",
];

const SAMPLE_ROWS = [
  [
    200001, "Email", "15-Jan-25", "16-Jan-25", "17-Jan-25", "January 2025",
    "HIGH", "Julie",
    "Suspected mis-selling of insurance to merchant",
    "Employee", "Rohit Sharma", "E10023", "OCL", "L3",
    "Amit Verma", "E20045", "OCL", "L2",
    "Noida", "UP",
    "OCL HRBP", "Sunita Rao", "OCL", "Sales", "Sale",
    "Employee Fraud", "Mis-selling",
    "", "CLOSED", "Under review by DC",
    "Yes", "Final Report Sent", "20-Mar-25",
    "Yes", "Yes", 1, "Warning Letter", "Completed", "25-Mar-25",
    "Process review", "Completed", "28-Mar-25",
    64, 64, "Yes", "", "",
  ],
  [
    200002, "Whistleblower Portal", "03-Feb-25", "04-Feb-25", "05-Feb-25", "February 2025",
    "MEDIUM", "Sakshi",
    "Reimbursement claim with falsified receipts",
    "Anonymous", "", "", "", "",
    "Priya Mehta", "E31002", "PSPL", "L4",
    "Bengaluru", "Karnataka",
    "PSPL HRBP", "Arun Das", "PSPL", "Finance", "Not Sale",
    "Employee Fraud", "Reimbursement Fraud",
    "", "INVESTIGATION_IN_PROGRESS", "Investigation underway",
    "", "", "",
    "", "", 0, "", "", "",
    "", "", "",
    "", "", "No", "", "",
  ],
  [
    200003, "Helpline", "20-Feb-25", "21-Feb-25", "22-Feb-25", "February 2025",
    "LOW", "Ankita",
    "Verbal abuse complaint from team member",
    "Employee", "Kavya Nair", "E44200", "PCL", "L2",
    "Deepak Saxena", "E50110", "PCL", "L3",
    "Mumbai", "Maharashtra",
    "PCL HRBP", "Meera Roy", "PCL", "Operations", "Not Sale",
    "Employee Concerns", "Decorum - Verbal Abuse & Unprofessional Conduct",
    "", "INVESTIGATION_NOT_STARTED", "",
    "", "", "",
    "", "", 0, "", "", "",
    "", "", "",
    "", "", "No", "", "",
  ],
];

const REFERENCE_DATA = [
  ["Field", "Allowed Values"],
  ["Severity", "LOW / MEDIUM / HIGH / CRITICAL"],
  ["Investigation Status", "INVESTIGATION_NOT_STARTED / INCOMPLETE_DETAILS / INVESTIGATION_IN_PROGRESS / DRAFT_REVIEW / CLOSED_WITH_MHD / CLOSED_WITH_HR_SPOC / PENDING_L1_REVIEW / PENDING_L2_REVIEW / CLOSED"],
  ["Type of Complainant", "Employee / External / Anonymous"],
  ["Sale/Not - Sale", "Sale / Not Sale"],
  ["Substantiated", "Yes / No"],
  ["Process/Employee Rec Approved by DC", "Yes / No"],
  ["Escalation Channel", "Employee Escalations / Whistleblower Portal / Email / Helpline / Walk-in / Anonymous"],
  ["Responsibility (Investigator)", "Julie / Sakshi / Ankita / Ruchika"],
  ["Respondent Entity", "OCL / PSPL / PCL / PFSL / PML"],
  ["Dates format", "DD-Mon-YY  e.g. 15-Jan-25  or  DD/MM/YYYY"],
];

export async function GET() {
  const wsData = [HEADERS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cases");

  const wsRef = XLSX.utils.aoa_to_sheet(REFERENCE_DATA);
  wsRef["!cols"] = [{ wch: 40 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=Vigilance_Import_Template.xlsx",
    },
  });
}
