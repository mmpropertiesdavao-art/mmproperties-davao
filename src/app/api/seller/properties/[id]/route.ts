import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  const actor = await requireRole(['seller', 'agent', 'admin'])
  const { id } = await context.params
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const title = String(body.title || '').trim()
  const availability = String(body.availability || 'available')
  const hasManualPreviousPrice = Object.prototype.hasOwnProperty.call(body, 'previousPrice') || Object.prototype.hasOwnProperty.call(body, 'previous_price')
  const manualPreviousPrice = toNumber(body.previousPrice ?? body.previous_price)

  if (!title) {
    return NextResponse.json({ error: 'Property title is required.' }, { status: 400 })
  }

  if (!['available', 'reserved', 'rented', 'sold', 'inactive'].includes(availability)) {
    return NextResponse.json({ error: 'Invalid availability.' }, { status: 400 })
  }

  const { rows } = await db.query<{ id: string }>({
    text: `
      UPDATE properties p
      SET
        title = $1,
        description = $2,
        price = $3,
        previous_price = CASE
          WHEN $14::boolean AND $15::numeric IS NOT NULL THEN $15::numeric
          WHEN $14::boolean AND $15::numeric IS NULL AND p.previous_price IS NOT NULL THEN NULL
          WHEN $3::numeric < p.price THEN p.price
          WHEN $3::numeric > p.price THEN NULL
          ELSE p.previous_price
        END,
        price_reduced_at = CASE
          WHEN $14::boolean AND $15::numeric IS NOT NULL AND $15::numeric > $3::numeric THEN COALESCE(p.price_reduced_at, now())
          WHEN $14::boolean AND $15::numeric IS NULL AND p.previous_price IS NOT NULL THEN NULL
          WHEN $3::numeric < p.price THEN now()
          WHEN $3::numeric > p.price THEN NULL
          ELSE p.price_reduced_at
        END,
        listing_intent = $4,
        availability = $5,
        status = CASE WHEN $5 = 'sold' THEN 'sold' WHEN $5 = 'inactive' THEN 'inactive' ELSE 'active' END,
        barangay = $6,
        bedrooms = $7,
        bathrooms = $8,
        lot_area_sqm = $9,
        floor_area_sqm = $10,
        updated_at = now()
      WHERE p.id = $11::uuid
      AND (
        $13::text = 'admin'
        OR p.seller_id = $12::uuid
        OR (
          $13::text = 'agent'
          AND EXISTS (
            SELECT 1
            FROM agents a
            WHERE a.id = p.agent_id
              AND a.user_id = $12::uuid
          )
        )
      )
      RETURNING p.id
    `,
    values: [
      title,
      String(body.description || '').trim() || null,
      toNumber(body.price),
      String(body.listingIntent || 'sale'),
      availability,
      String(body.barangay || '').trim() || null,
      toNumber(body.bedrooms),
      toNumber(body.bathrooms),
      toNumber(body.lotAreaSqm),
      toNumber(body.floorAreaSqm),
      id,
      actor.userId,
      actor.role,
      hasManualPreviousPrice,
      manualPreviousPrice,
    ],
  })

  if (!rows[0]) {
    return NextResponse.json(
      { error: 'Property not found or you do not have permission to edit it.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    ok: true,
    id: rows[0].id,
  })
}
