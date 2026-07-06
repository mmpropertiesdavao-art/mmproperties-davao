import { db } from "@/lib/supabase/server";

export type LeadStage =
  | "all"
  | "new"
  | "contacted"
  | "qualified"
  | "follow_up"
  | "interested"
  | "lost"
  | "under_contract"
  | "closed";

export type LeadPipelineRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: Exclude<LeadStage, "all"> | string | null;
  source: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  propertySlug: string | null;
  propertyAddress: string | null;
  barangay: string | null;
  coverImageUrl: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
  agentName: string | null;
  agentEmail: string | null;
  internalNotes: string | null;
  followUpAt: string | null;
  createdAt: string | null;
  externalCrmProvider: string | null;
  syncStatus: string | null;
  recordType?: "inquiry" | "lead";
  leadType?: string | null;
  propertyType?: string | null;
  budget?: string | null;
  buyingTimeline?: string | null;
  preferredLocation?: string | null;
};

export type LeadPipelineData = {
  leads: LeadPipelineRow[];
  supportsNotes: boolean;
  supportsFollowUp: boolean;
  supportsCrmFields: boolean;
};

export type LeadViewer = {
  role: "admin" | "seller" | "agent";
  userId: string;
};

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function firstExisting(columns: string[], options: string[]) {
  return options.find((option) => columns.includes(option)) || null;
}

function selectTextColumn(tableAlias: string, column: string | null, alias: string) {
  if (!column) return `NULL::text AS ${quoteIdentifier(alias)}`;
  return `${tableAlias}.${quoteIdentifier(column)}::text AS ${quoteIdentifier(alias)}`;
}

async function getColumns(tableName: string) {
  const { rows } = await db.query<{ column_name: string }>({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `,
    values: [tableName],
  });

  return rows.map((row) => row.column_name);
}

async function tableExists(tableName: string) {
  const { rows } = await db.query<{ exists: boolean }>({
    text: "SELECT to_regclass($1) IS NOT NULL AS exists",
    values: [`public.${tableName}`],
  });
  return Boolean(rows[0]?.exists);
}

function visibilitySql(viewer: LeadViewer, userParamIndex: number, inquiryColumns: string[]) {
  if (viewer.role === "admin") return "";

  if (viewer.role === "agent") {
    const assignedUserCheck = inquiryColumns.includes("assigned_user_id")
      ? `OR i.assigned_user_id = $${userParamIndex}::uuid`
      : "";
    return `
      (
        agent_user.id = $${userParamIndex}::uuid
        ${assignedUserCheck}
      )
    `;
  }

  const assignedSellerCheck = inquiryColumns.includes("assigned_seller_id")
    ? `OR i.assigned_seller_id = $${userParamIndex}::uuid`
    : "";
  return `
    (
      p.seller_id = $${userParamIndex}::uuid
      ${assignedSellerCheck}
    )
  `;
}

export async function getLeadPipelineData(viewer: LeadViewer, q = ""): Promise<LeadPipelineData> {
  const inquiryColumns = await getColumns("inquiries");
  const propertyColumns = await getColumns("properties");

  const idColumn = firstExisting(inquiryColumns, ["id"]);
  const nameColumn = firstExisting(inquiryColumns, ["name", "full_name", "buyer_name", "lead_name", "contact_name"]);
  const emailColumn = firstExisting(inquiryColumns, ["email", "buyer_email", "lead_email", "contact_email"]);
  const phoneColumn = firstExisting(inquiryColumns, ["phone", "phone_number", "mobile", "contact_number"]);
  const messageColumn = firstExisting(inquiryColumns, ["message", "notes", "inquiry", "question", "comment"]);
  const statusColumn = firstExisting(inquiryColumns, ["status", "lead_status", "inquiry_status"]);
  const sourceColumn = firstExisting(inquiryColumns, ["lead_source", "source", "channel"]);
  const propertyIdColumn = firstExisting(inquiryColumns, ["property_id", "listing_id"]);
  const createdAtColumn = firstExisting(inquiryColumns, ["created_at", "inserted_at", "submitted_at", "date_created"]);
  const internalNotesColumn = firstExisting(inquiryColumns, ["internal_notes", "private_notes", "admin_notes"]);
  const followUpAtColumn = firstExisting(inquiryColumns, ["follow_up_at", "next_follow_up_at", "followup_at"]);
  const externalCrmProviderColumn = firstExisting(inquiryColumns, ["external_crm_provider"]);
  const syncStatusColumn = firstExisting(inquiryColumns, ["sync_status"]);
  const coverImageColumn = firstExisting(propertyColumns, ["cover_image_url", "coverImageUrl"]);

  const propertyJoin = propertyIdColumn
    ? `LEFT JOIN properties p ON p.id = i.${quoteIdentifier(propertyIdColumn)}`
    : "LEFT JOIN properties p ON false";

  const values: unknown[] = [];
  const whereParts: string[] = ["1 = 1"];

  if (q.trim()) {
    values.push(`%${q.trim()}%`);
    const index = values.length;
    whereParts.push(`(
      ${nameColumn ? `i.${quoteIdentifier(nameColumn)}::text ILIKE $${index} OR` : ""}
      ${emailColumn ? `i.${quoteIdentifier(emailColumn)}::text ILIKE $${index} OR` : ""}
      ${phoneColumn ? `i.${quoteIdentifier(phoneColumn)}::text ILIKE $${index} OR` : ""}
      ${messageColumn ? `i.${quoteIdentifier(messageColumn)}::text ILIKE $${index} OR` : ""}
      p.title::text ILIKE $${index} OR
      p.address::text ILIKE $${index} OR
      p.barangay::text ILIKE $${index} OR
      seller.email::text ILIKE $${index} OR
      seller.full_name::text ILIKE $${index} OR
      agent_user.email::text ILIKE $${index} OR
      agent_user.full_name::text ILIKE $${index}
    )`);
  }

  if (viewer.role !== "admin") {
    values.push(viewer.userId);
    whereParts.push(visibilitySql(viewer, values.length, inquiryColumns));
  }

  const { rows } = await db.query<LeadPipelineRow>({
    text: `
      SELECT
        ${selectTextColumn("i", idColumn, "id")},
        ${selectTextColumn("i", nameColumn, "name")},
        ${selectTextColumn("i", emailColumn, "email")},
        ${selectTextColumn("i", phoneColumn, "phone")},
        ${selectTextColumn("i", messageColumn, "message")},
        ${selectTextColumn("i", statusColumn, "status")},
        ${selectTextColumn("i", sourceColumn, "source")},
        ${selectTextColumn("i", propertyIdColumn, "propertyId")},
        p.title::text AS "propertyTitle",
        p.slug::text AS "propertySlug",
        p.address::text AS "propertyAddress",
        p.barangay::text AS "barangay",
        ${coverImageColumn ? `p.${quoteIdentifier(coverImageColumn)}::text` : "NULL::text"} AS "coverImageUrl",
        seller.full_name::text AS "sellerName",
        seller.email::text AS "sellerEmail",
        agent_user.full_name::text AS "agentName",
        agent_user.email::text AS "agentEmail",
        ${selectTextColumn("i", internalNotesColumn, "internalNotes")},
        ${selectTextColumn("i", followUpAtColumn, "followUpAt")},
        ${selectTextColumn("i", createdAtColumn, "createdAt")},
        ${selectTextColumn("i", externalCrmProviderColumn, "externalCrmProvider")},
        ${selectTextColumn("i", syncStatusColumn, "syncStatus")}
      FROM inquiries i
      ${propertyJoin}
      LEFT JOIN users seller ON seller.id = p.seller_id
      LEFT JOIN agents a ON a.id = p.agent_id
      LEFT JOIN users agent_user ON agent_user.id = a.user_id
      WHERE ${whereParts.join(" AND ")}
      ORDER BY ${createdAtColumn ? `i.${quoteIdentifier(createdAtColumn)} DESC NULLS LAST` : "1"}
      LIMIT 800
    `,
    values,
  });

  const unifiedRows: LeadPipelineRow[] = rows.map((row) => ({ ...row, recordType: "inquiry" }));

  if (viewer.role === "admin" && await tableExists("leads")) {
    const leadWhereParts = ["1 = 1"];
    const leadValues: unknown[] = [];
    if (q.trim()) {
      leadValues.push(`%${q.trim()}%`);
      leadWhereParts.push(`(
        full_name ILIKE $1 OR email ILIKE $1 OR mobile ILIKE $1 OR
        COALESCE(message, '') ILIKE $1 OR COALESCE(property_title, '') ILIKE $1 OR
        COALESCE(property_address, '') ILIKE $1 OR COALESCE(preferred_location, '') ILIKE $1
      )`);
    }
    const { rows: leadRows } = await db.query<LeadPipelineRow>({
      text: `
        SELECT
          id::text AS "id",
          full_name::text AS "name",
          email::text AS "email",
          mobile::text AS "phone",
          message::text AS "message",
          status::text AS "status",
          COALESCE(source_page, lead_type)::text AS "source",
          property_id::text AS "propertyId",
          property_title::text AS "propertyTitle",
          NULL::text AS "propertySlug",
          property_address::text AS "propertyAddress",
          preferred_location::text AS "barangay",
          NULL::text AS "coverImageUrl",
          NULL::text AS "sellerName",
          NULL::text AS "sellerEmail",
          NULL::text AS "agentName",
          NULL::text AS "agentEmail",
          internal_notes::text AS "internalNotes",
          follow_up_at::text AS "followUpAt",
          created_at::text AS "createdAt",
          external_crm_provider::text AS "externalCrmProvider",
          sync_status::text AS "syncStatus",
          'lead'::text AS "recordType",
          lead_type::text AS "leadType",
          property_type::text AS "propertyType",
          budget::text AS "budget",
          buying_timeline::text AS "buyingTimeline",
          preferred_location::text AS "preferredLocation"
        FROM leads
        WHERE ${leadWhereParts.join(" AND ")}
        ORDER BY created_at DESC NULLS LAST
        LIMIT 800
      `,
      values: leadValues,
    });
    unifiedRows.push(...leadRows);
  }

  unifiedRows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return {
    leads: unifiedRows,
    supportsNotes: Boolean(internalNotesColumn),
    supportsFollowUp: Boolean(followUpAtColumn),
    supportsCrmFields: Boolean(externalCrmProviderColumn),
  };
}
