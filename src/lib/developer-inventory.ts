import { db } from "@/lib/supabase/server";

export type DeveloperProjectSearchRow = {
  id: string;
  slug: string;
  projectName: string;
  developerName: string;
  status: string;
  address: string | null;
  barangay: string | null;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  heroImage: string | null;
  startingPrice: number | null;
  modelCount: number;
  hasLotOnly: boolean;
  availableUnits: number;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  bathroomsMin: number | null;
  bathroomsMax: number | null;
  floorAreaMin: number | null;
  floorAreaMax: number | null;
  lotAreaMin: number | null;
  lotAreaMax: number | null;
};

type DeveloperProjectFilters = {
  query?: string | null;
  developerName?: string | null;
  barangay?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minBedrooms?: number | null;
  minBathrooms?: number | null;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function parseTextList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getActiveDeveloperProjects(limit = 24, filters: DeveloperProjectFilters = {}) {
  const { rows } = await db.query<DeveloperProjectSearchRow>({
    text: `
      WITH project_rollup AS (
        SELECT
          p.id,
          p.slug,
          p.project_name AS "projectName",
          d.name AS "developerName",
          p.status,
          p.address,
          p.barangay,
          p.city,
          p.province,
          p.latitude,
          p.longitude,
          p.hero_image AS "heroImage",
          MIN(m.current_price)::float AS "startingPrice",
          COUNT(DISTINCT m.id)::int AS "modelCount",
          BOOL_OR(m.model_type = 'lot_only') AS "hasLotOnly",
          COALESCE(SUM(inv.available_units), 0)::int AS "availableUnits",
          MIN(m.bedrooms)::int AS "bedroomsMin",
          MAX(m.bedrooms)::int AS "bedroomsMax",
          MIN(m.bathrooms)::float AS "bathroomsMin",
          MAX(m.bathrooms)::float AS "bathroomsMax",
          MIN(m.floor_area)::float AS "floorAreaMin",
          MAX(m.floor_area)::float AS "floorAreaMax",
          MIN(m.lot_area)::float AS "lotAreaMin",
          MAX(m.lot_area)::float AS "lotAreaMax",
          p.updated_at
        FROM developer_projects p
        JOIN developers d ON d.id = p.developer_id
        LEFT JOIN developer_house_models m ON m.project_id = p.id AND m.active = true
        LEFT JOIN developer_model_inventory inv ON inv.model_id = m.id
        WHERE p.active = true
          AND p.status <> 'inactive'
          AND ($2::text IS NULL OR d.name ILIKE '%' || $2 || '%')
          AND ($3::text IS NULL OR p.barangay ILIKE '%' || $3 || '%' OR p.address ILIKE '%' || $3 || '%' OR p.city ILIKE '%' || $3 || '%')
          AND (
            $4::text IS NULL
            OR d.name ILIKE '%' || $4 || '%'
            OR p.project_name ILIKE '%' || $4 || '%'
            OR p.barangay ILIKE '%' || $4 || '%'
            OR p.address ILIKE '%' || $4 || '%'
            OR EXISTS (
              SELECT 1 FROM developer_house_models qm
              WHERE qm.project_id = p.id AND qm.name ILIKE '%' || $4 || '%'
            )
          )
        GROUP BY p.id, d.name
      )
      SELECT *
      FROM project_rollup
      WHERE ($5::numeric IS NULL OR "startingPrice" >= $5)
        AND ($6::numeric IS NULL OR "startingPrice" <= $6)
        AND ($7::int IS NULL OR "bedroomsMax" >= $7)
        AND ($8::numeric IS NULL OR "bathroomsMax" >= $8)
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    values: [
      limit,
      filters.developerName || null,
      filters.barangay || null,
      filters.query || null,
      filters.minPrice ?? null,
      filters.maxPrice ?? null,
      filters.minBedrooms ?? null,
      filters.minBathrooms ?? null,
    ],
  });

  return rows;
}

export async function getDeveloperProjectBySlug(slug: string) {
  const { rows } = await db.query({
    text: `
      SELECT
        p.id,
        p.slug,
        p.project_name AS "projectName",
        p.address,
        p.barangay,
        p.city,
        p.province,
        p.latitude,
        p.longitude,
        p.description,
        p.status,
        p.completion_date AS "completionDate",
        p.amenities,
        p.hero_image AS "heroImage",
        p.gallery,
        p.seo_title AS "seoTitle",
        p.seo_description AS "seoDescription",
        d.id AS "developerId",
        d.name AS "developerName",
        d.logo_url AS "developerLogo",
        d.website AS "developerWebsite",
        d.contact_number AS "developerContactNumber",
        d.email AS "developerEmail"
      FROM developer_projects p
      JOIN developers d ON d.id = p.developer_id
      WHERE p.slug = $1
        AND p.active = true
      LIMIT 1
    `,
    values: [slug],
  });

  const project = rows[0];
  if (!project) return null;

  const [models, priceHistory] = await Promise.all([
    db.query({
      text: `
        SELECT
          m.id,
          m.model_type AS "modelType",
          m.name,
          m.bedrooms,
          m.bathrooms::float AS bathrooms,
          m.floor_area::float AS "floorArea",
          m.lot_area::float AS "lotArea",
          m.parking_slots AS "parkingSlots",
          m.current_price::float AS "currentPrice",
          m.description,
          m.specifications,
          m.floor_plan_image AS "floorPlanImage",
          m.gallery,
          COALESCE(SUM(inv.available_units), 0)::int AS "availableUnits",
          COALESCE(SUM(inv.reserved_units), 0)::int AS "reservedUnits",
          COALESCE(SUM(inv.sold_units), 0)::int AS "soldUnits",
          (
            SELECT ph.previous_price::float
            FROM developer_model_price_history ph
            WHERE ph.model_id = m.id
            ORDER BY ph.effective_date DESC, ph.created_at DESC
            LIMIT 1
          ) AS "previousPrice",
          (
            SELECT ph.price_difference::float
            FROM developer_model_price_history ph
            WHERE ph.model_id = m.id
            ORDER BY ph.effective_date DESC, ph.created_at DESC
            LIMIT 1
          ) AS "priceDifference",
          (
            SELECT ph.percentage_change::float
            FROM developer_model_price_history ph
            WHERE ph.model_id = m.id
            ORDER BY ph.effective_date DESC, ph.created_at DESC
            LIMIT 1
          ) AS "percentageChange"
        FROM developer_house_models m
        LEFT JOIN developer_model_inventory inv ON inv.model_id = m.id
        WHERE m.project_id = $1::uuid
          AND m.active = true
        GROUP BY m.id
        ORDER BY m.current_price NULLS LAST, m.created_at ASC
      `,
      values: [project.id],
    }),
    db.query({
      text: `
        SELECT
          ph.model_id AS "modelId",
          ph.previous_price::float AS "previousPrice",
          ph.new_price::float AS "newPrice",
          ph.price_difference::float AS "priceDifference",
          ph.percentage_change::float AS "percentageChange",
          ph.effective_date AS "effectiveDate"
        FROM developer_model_price_history ph
        JOIN developer_house_models m ON m.id = ph.model_id
        WHERE m.project_id = $1::uuid
        ORDER BY ph.effective_date DESC, ph.created_at DESC
      `,
      values: [project.id],
    }),
  ]);

  return { project, models: models.rows, priceHistory: priceHistory.rows };
}
