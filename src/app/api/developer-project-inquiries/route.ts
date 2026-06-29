import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const projectId = String(body.projectId || "");
  const modelId = String(body.modelId || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();

  if (!projectId || !name || !email) {
    return NextResponse.json({ error: "Project, name, and email are required." }, { status: 400 });
  }

  const { rows } = await db.query<{ id: string }>({
    text: `
      INSERT INTO developer_project_inquiries(project_id, model_id, name, email, phone, message)
      SELECT p.id, NULLIF($2, '')::uuid, $3, $4, NULLIF($5, ''), NULLIF($6, '')
      FROM developer_projects p
      WHERE p.id = $1::uuid
      RETURNING id
    `,
    values: [projectId, modelId, name, email, phone, message],
  });

  if (!rows[0]) return NextResponse.json({ error: "Developer project not found." }, { status: 404 });
  return NextResponse.json({ id: rows[0].id, status: "new" }, { status: 201 });
}
