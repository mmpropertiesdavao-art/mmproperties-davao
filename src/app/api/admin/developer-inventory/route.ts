import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { parseTextList, slugify } from "@/lib/developer-inventory";

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: unknown) {
  const parsed = toNumber(value);
  return parsed === null ? 0 : Math.max(0, Math.round(parsed));
}

function toBool(value: unknown, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value === true || value === "true" || value === "on";
}

async function uniqueProjectSlug(name: string, id?: string) {
  const base = slugify(name) || `project-${Date.now().toString(36)}`;
  let slug = base;
  let index = 2;

  while (true) {
    const { rows } = await db.query<{ id: string }>({
      text: `SELECT id FROM developer_projects WHERE slug=$1 AND ($2::uuid IS NULL OR id<>$2::uuid) LIMIT 1`,
      values: [slug, id || null],
    });
    if (!rows[0]) return slug;
    slug = `${base}-${index++}`;
  }
}

export async function GET() {
  await requireRole(["admin"]);

  const { rows } = await db.query({
    text: `
      SELECT
        d.id,
        d.name,
        d.slug,
        d.logo_url AS "logoUrl",
        d.description,
        d.website,
        d.contact_number AS "contactNumber",
        d.email,
        d.is_active AS "isActive",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'projectName', p.project_name,
              'slug', p.slug,
              'address', p.address,
              'barangay', p.barangay,
              'city', p.city,
              'province', p.province,
              'latitude', p.latitude,
              'longitude', p.longitude,
              'gallery', p.gallery,
              'description', p.description,
              'amenities', p.amenities,
              'status', p.status,
              'heroImage', p.hero_image,
              'active', p.active,
              'modelCount', (SELECT COUNT(*)::int FROM developer_house_models m WHERE m.project_id=p.id),
              'availableUnits', COALESCE((SELECT SUM(inv.available_units)::int FROM developer_house_models m LEFT JOIN developer_model_inventory inv ON inv.model_id=m.id WHERE m.project_id=p.id),0),
              'models', COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', m.id,
                    'modelType', m.model_type,
                    'name', m.name,
                    'bedrooms', m.bedrooms,
                    'bathrooms', m.bathrooms,
                    'floorArea', m.floor_area,
                    'lotArea', m.lot_area,
                    'parkingSlots', m.parking_slots,
                    'currentPrice', m.current_price,
                    'description', m.description,
                    'floorPlanImage', m.floor_plan_image,
                    'gallery', m.gallery,
                    'active', m.active,
                    'availableUnits', COALESCE((SELECT SUM(inv.available_units)::int FROM developer_model_inventory inv WHERE inv.model_id=m.id),0),
                    'reservedUnits', COALESCE((SELECT SUM(inv.reserved_units)::int FROM developer_model_inventory inv WHERE inv.model_id=m.id),0),
                    'soldUnits', COALESCE((SELECT SUM(inv.sold_units)::int FROM developer_model_inventory inv WHERE inv.model_id=m.id),0)
                  )
                  ORDER BY m.created_at
                )
                FROM developer_house_models m
                WHERE m.project_id=p.id
              ), '[]'::jsonb)
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::jsonb
        ) AS projects
      FROM developers d
      LEFT JOIN developer_projects p ON p.developer_id = d.id
      GROUP BY d.id
      ORDER BY d.name
    `,
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const type = String(body.type || "");

  if (type === "developer") {
    const name = String(body.name || "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Developer name is required." }, { status: 400 });

    const { rows } = await db.query({
      text: `
        INSERT INTO developers(name, slug, logo_url, description, website, contact_number, email, is_active, updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())
        RETURNING id
      `,
      values: [
        name,
        slugify(name),
        body.logoUrl || null,
        String(body.description || "").trim() || null,
        String(body.website || "").trim() || null,
        String(body.contactNumber || "").trim() || null,
        String(body.email || "").trim() || null,
        toBool(body.isActive),
      ],
    });
    return NextResponse.json(rows[0], { status: 201 });
  }

  if (type === "project") {
    const developerId = String(body.developerId || "");
    const projectName = String(body.projectName || "").trim();
    if (!developerId || projectName.length < 2) return NextResponse.json({ error: "Developer and project name are required." }, { status: 400 });
    const slug = await uniqueProjectSlug(projectName);

    const { rows } = await db.query({
      text: `
        INSERT INTO developer_projects(
          developer_id, project_name, slug, address, barangay, city, province, latitude, longitude,
          description, status, completion_date, amenities, hero_image, gallery, seo_title, seo_description, active
        )
        VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id, slug
      `,
      values: [
        developerId,
        projectName,
        slug,
        String(body.address || "").trim() || null,
        String(body.barangay || "").trim() || null,
        String(body.city || "Davao City").trim(),
        String(body.province || "Davao del Sur").trim(),
        toNumber(body.latitude),
        toNumber(body.longitude),
        String(body.description || "").trim() || null,
        String(body.status || "pre_selling"),
        body.completionDate || null,
        parseTextList(body.amenities),
        body.heroImage || null,
        parseTextList(body.gallery),
        String(body.seoTitle || "").trim() || null,
        String(body.seoDescription || "").trim() || null,
        toBool(body.active),
      ],
    });
    return NextResponse.json(rows[0], { status: 201 });
  }

  if (type === "model") {
    const projectId = String(body.projectId || "");
    const name = String(body.name || "").trim();
    if (!projectId || name.length < 1) return NextResponse.json({ error: "Project and model name are required." }, { status: 400 });
    const currentPrice = toNumber(body.currentPrice);

    const { rows } = await db.query<{ id: string }>({
      text: `
        INSERT INTO developer_house_models(
          project_id, model_type, name, bedrooms, bathrooms, floor_area, lot_area, parking_slots,
          current_price, description, specifications, floor_plan_image, gallery, active
        )
        VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
        RETURNING id
      `,
      values: [
        projectId,
        String(body.modelType || "house_model") === "lot_only" ? "lot_only" : "house_model",
        name,
        toNumber(body.bedrooms),
        toNumber(body.bathrooms),
        toNumber(body.floorArea),
        toNumber(body.lotArea),
        toNumber(body.parkingSlots),
        currentPrice,
        String(body.description || "").trim() || null,
        JSON.stringify(body.specifications || {}),
        body.floorPlanImage || null,
        parseTextList(body.gallery),
        toBool(body.active),
      ],
    });

    if (currentPrice) {
      await db.query({
        text: `INSERT INTO developer_model_price_history(model_id, previous_price, new_price, price_difference, percentage_change, created_by) VALUES($1::uuid,NULL,$2,$2,NULL,$3::uuid)`,
        values: [rows[0].id, currentPrice, actor.userId],
      });
    }

    await db.query({
      text: `INSERT INTO developer_model_inventory(model_id, available_units, reserved_units, sold_units, phase, block) VALUES($1::uuid,$2,$3,$4,$5,$6)`,
      values: [rows[0].id, toInt(body.availableUnits), toInt(body.reservedUnits), toInt(body.soldUnits), String(body.phase || "").trim() || null, String(body.block || "").trim() || null],
    });

    return NextResponse.json(rows[0], { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported developer inventory action." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const actor = await requireRole(["admin"]);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const type = String(body.type || "");
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Record id is required." }, { status: 400 });

  if (type === "developer") {
    const name = String(body.name || "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Developer name is required." }, { status: 400 });
    await db.query({
      text: `
        UPDATE developers
        SET name=$1, slug=$2, logo_url=$3, description=$4, website=$5, contact_number=$6, email=$7, is_active=$8, updated_at=now()
        WHERE id=$9::uuid
      `,
      values: [name, slugify(name), body.logoUrl || null, body.description || null, body.website || null, body.contactNumber || null, body.email || null, toBool(body.isActive), id],
    });
    return NextResponse.json({ ok: true });
  }

  if (type === "project") {
    const projectName = String(body.projectName || "").trim();
    if (projectName.length < 2) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    const slug = body.slug ? slugify(String(body.slug)) : await uniqueProjectSlug(projectName, id);
    await db.query({
      text: `
        UPDATE developer_projects
        SET project_name=$1, slug=$2, address=$3, barangay=$4, city=$5, province=$6, latitude=$7, longitude=$8,
            description=$9, status=$10, completion_date=$11, amenities=$12, hero_image=$13, gallery=$14,
            seo_title=COALESCE($15, seo_title), seo_description=COALESCE($16, seo_description), active=$17, updated_at=now()
        WHERE id=$18::uuid
      `,
      values: [projectName, slug, body.address || null, body.barangay || null, body.city || "Davao City", body.province || "Davao del Sur", toNumber(body.latitude), toNumber(body.longitude), body.description || null, body.status || "pre_selling", body.completionDate || null, parseTextList(body.amenities), body.heroImage || null, parseTextList(body.gallery), body.seoTitle === undefined ? null : body.seoTitle || null, body.seoDescription === undefined ? null : body.seoDescription || null, toBool(body.active), id],
    });
    return NextResponse.json({ ok: true, slug });
  }

  if (type === "model") {
    const { rows: existing } = await db.query<{ currentPrice: number | null }>({
      text: `SELECT current_price::float AS "currentPrice" FROM developer_house_models WHERE id=$1::uuid`,
      values: [id],
    });
    if (!existing[0]) return NextResponse.json({ error: "House model not found." }, { status: 404 });

    const oldPrice = existing[0].currentPrice;
    const newPrice = toNumber(body.currentPrice);
    await db.query({
      text: `
        UPDATE developer_house_models
        SET model_type=$1, name=$2, bedrooms=$3, bathrooms=$4, floor_area=$5, lot_area=$6, parking_slots=$7,
            current_price=$8, description=$9, specifications=$10::jsonb, floor_plan_image=$11, gallery=$12, active=$13, updated_at=now()
        WHERE id=$14::uuid
      `,
      values: [String(body.modelType || "house_model") === "lot_only" ? "lot_only" : "house_model", body.name || "Model", toNumber(body.bedrooms), toNumber(body.bathrooms), toNumber(body.floorArea), toNumber(body.lotArea), toNumber(body.parkingSlots), newPrice, body.description || null, JSON.stringify(body.specifications || {}), body.floorPlanImage || null, parseTextList(body.gallery), toBool(body.active), id],
    });

    if (newPrice !== null && oldPrice !== newPrice) {
      const difference = oldPrice === null ? newPrice : newPrice - oldPrice;
      const percentage = oldPrice && oldPrice > 0 ? (difference / oldPrice) * 100 : null;
      await db.query({
        text: `INSERT INTO developer_model_price_history(model_id, previous_price, new_price, price_difference, percentage_change, created_by) VALUES($1::uuid,$2,$3,$4,$5,$6::uuid)`,
        values: [id, oldPrice, newPrice, difference, percentage, actor.userId],
      });
    }

    await db.query({
      text: `
        INSERT INTO developer_model_inventory(model_id, available_units, reserved_units, sold_units, phase, block, last_updated)
        VALUES($1::uuid,$2,$3,$4,$5,$6,now())
        ON CONFLICT (model_id, phase, block)
        DO UPDATE SET available_units=EXCLUDED.available_units, reserved_units=EXCLUDED.reserved_units, sold_units=EXCLUDED.sold_units, last_updated=now()
      `,
      values: [id, toInt(body.availableUnits), toInt(body.reservedUnits), toInt(body.soldUnits), String(body.phase || "").trim() || null, String(body.block || "").trim() || null],
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported developer inventory update." }, { status: 400 });
}
