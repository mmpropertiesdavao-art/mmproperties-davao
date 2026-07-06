import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getLeadPipelineData } from "@/lib/leads/pipeline";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  const format = request.nextUrl.searchParams.get("format") || "csv";
  const data = await getLeadPipelineData({ role: "admin", userId: actor.userId }, "");
  const headers = [
    "createdAt",
    "recordType",
    "leadType",
    "status",
    "name",
    "email",
    "phone",
    "preferredLocation",
    "budget",
    "buyingTimeline",
    "propertyTitle",
    "propertyAddress",
    "message",
    "source",
  ];
  const rows = data.leads.map((lead) => headers.map((key) => escapeCsv((lead as any)[key])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  if (format === "xls") {
    const html = `
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${data.leads.map((lead) => `<tr>${headers.map((header) => `<td>${String((lead as any)[header] ?? "").replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    `;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="mm-properties-leads.xls"`,
      },
    });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mm-properties-leads.csv"`,
    },
  });
}
