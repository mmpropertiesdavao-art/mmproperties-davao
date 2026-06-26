import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type ColumnRow = {
  column_name: string
  data_type: string
}

const EDITABLE_COLUMNS = [
  'title',
  'slug',
  'description',
  'barangay',
  'price',
  'previous_price',
  'rent_price',
  'listing_intent',
  'status',
  'availability',
  'bedrooms',
  'bathrooms',
  'lot_area_sqm',
  'floor_area_sqm',
  'carport',
  'carport_spaces',
  'parking_spaces',
  'garage_spaces',
  'financing_available',
  'assume_balance_available',
  'is_featured',
  'featured',
]

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function getPropertiesColumns() {
  const { rows } = await db.query<ColumnRow>({
    text: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'properties'
      ORDER BY ordinal_position
    `,
  })

  return rows
}

function normalizeValue(value: unknown, dataType: string) {
  if (value === '') return null

  if (
    [
      'integer',
      'bigint',
      'smallint',
      'numeric',
      'real',
      'double precision',
      'decimal',
    ].includes(dataType)
  ) {
    if (value === null || value === undefined) return null

    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) return null

    return numberValue
  }

  if (dataType === 'boolean') {
    return Boolean(value)
  }

  return value
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireRole(['admin'])

  const { id } = await context.params

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const updates = body.updates

  if (!updates || typeof updates !== 'object') {
    return NextResponse.json(
      { error: 'Missing updates object.' },
      { status: 400 }
    )
  }

  const columns = await getPropertiesColumns()
  const columnMap = new Map(columns.map((column) => [column.column_name, column]))

  const assignments: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const columnName of EDITABLE_COLUMNS) {
    if (!(columnName in updates)) continue

    const column = columnMap.get(columnName)

    if (!column) continue

    assignments.push(`${quoteIdentifier(columnName)} = $${paramIndex}`)
    values.push(normalizeValue(updates[columnName], column.data_type))
    paramIndex += 1
  }

  if (columnMap.has('updated_at')) {
    assignments.push(`updated_at = now()`)
  }

  if (assignments.length === 0) {
    return NextResponse.json(
      { error: 'No editable fields were provided.' },
      { status: 400 }
    )
  }

  values.push(id)

  const { rows } = await db.query<Record<string, any>>({
    text: `
      UPDATE properties
      SET ${assignments.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
    values,
  })

  if (!rows[0]) {
    return NextResponse.json(
      { error: 'Listing not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    ok: true,
    property: rows[0],
  })
}