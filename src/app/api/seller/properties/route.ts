import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const actor = await requireRole(['seller', 'agent', 'admin'])
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const title = String(body.title || '').trim()

  if (!title) {
    return NextResponse.json({ error: 'Property title is required.' }, { status: 400 })
  }

  const propertyTypeSlug = String(body.propertyType || 'house-and-lot').trim()
  const baseSlug = slugify(title)
  const finalSlug = `${baseSlug}-${Date.now()}`

  const { rows: propertyTypes } = await db.query<{ id: string }>({
    text: `
      SELECT id
      FROM property_types
      WHERE slug = $1
      LIMIT 1
    `,
    values: [propertyTypeSlug],
  })

  let propertyTypeId = propertyTypes[0]?.id

  if (!propertyTypeId) {
    const fallback = await db.query<{ id: string }>({
      text: `
        SELECT id
        FROM property_types
        ORDER BY name ASC
        LIMIT 1
      `,
    })

    propertyTypeId = fallback.rows[0]?.id
  }

  if (!propertyTypeId) {
    return NextResponse.json(
      {
        error:
          'No property type found. Add at least one row in property_types before sellers can submit listings.',
      },
      { status: 500 }
    )
  }

  const { rows } = await db.query<{ id: string }>({
    text: `
      INSERT INTO properties (
        seller_id,
        property_type_id,
        slug,
        title,
        description,
        price,
        listing_intent,
        availability,
        status,
        barangay,
        bedrooms,
        bathrooms,
        lot_area_sqm,
        floor_area_sqm,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7,
        'available',
        'pending',
        $8,
        $9,
        $10,
        $11,
        $12,
        now(),
        now()
      )
      RETURNING id
    `,
    values: [
      actor.userId,
      propertyTypeId,
      finalSlug,
      title,
      String(body.description || '').trim() || null,
      toNumber(body.price),
      String(body.listingIntent || 'sale'),
      String(body.barangay || '').trim() || null,
      toNumber(body.bedrooms),
      toNumber(body.bathrooms),
      toNumber(body.lotAreaSqm),
      toNumber(body.floorAreaSqm),
    ],
  })

  return NextResponse.json({
    ok: true,
    id: rows[0].id,
  })
}