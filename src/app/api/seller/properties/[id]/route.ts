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

  if (!title) {
    return NextResponse.json({ error: 'Property title is required.' }, { status: 400 })
  }

  const { rows } = await db.query<{ id: string }>({
    text: `
      UPDATE properties
      SET
        title = $1,
        description = $2,
        price = $3,
        listing_intent = $4,
        availability = $5,
        barangay = $6,
        bedrooms = $7,
        bathrooms = $8,
        lot_area_sqm = $9,
        floor_area_sqm = $10,
        updated_at = now()
      WHERE id = $11::uuid
      AND seller_id = $12::uuid
      RETURNING id
    `,
    values: [
      title,
      String(body.description || '').trim() || null,
      toNumber(body.price),
      String(body.listingIntent || 'sale'),
      String(body.availability || 'available'),
      String(body.barangay || '').trim() || null,
      toNumber(body.bedrooms),
      toNumber(body.bathrooms),
      toNumber(body.lotAreaSqm),
      toNumber(body.floorAreaSqm),
      id,
      actor.userId,
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