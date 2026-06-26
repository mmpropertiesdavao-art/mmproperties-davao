import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/supabase/server'

type ColumnRow = {
  column_name: string
  data_type: string
}

const CANDIDATE_COLUMNS = [
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
  'neighborhood_id',
  'property_type_id',
  'bedrooms',
  'bathrooms',
  'lot_area_sqm',
  'floor_area_sqm',
  'carport',
  'carport_spaces',
  'parking_spaces',
  'garage_spaces',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'map_latitude',
  'map_longitude',
  'location_latitude',
  'location_longitude',
  'financing_available',
  'assume_balance_available',
  'is_featured',
  'featured',
  'seller_id',
  'created_by',
  'uploaded_by',
  'user_id',
  'owner_id',
  'created_at',
  'updated_at',
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

function emptyToNull(value: unknown) {
  if (value === '') return null
  if (value === undefined) return null
  return value
}

function normalizeValue(value: unknown, dataType: string) {
  const cleanedValue = emptyToNull(value)

  if (cleanedValue === null) return null

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
    const numberValue = Number(cleanedValue)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  if (dataType === 'boolean') {
    return Boolean(cleanedValue)
  }

  return cleanedValue
}

function getCoordinateValue(body: Record<string, any>, columnName: string) {
  if (
    ['latitude', 'lat', 'map_latitude', 'location_latitude'].includes(columnName)
  ) {
    return body.latitude
  }

  if (
    ['longitude', 'lng', 'map_longitude', 'location_longitude'].includes(
      columnName
    )
  ) {
    return body.longitude
  }

  return body[columnName]
}

export async function POST(request: NextRequest) {
  const actor = await requireRole(['admin'])

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (!body.title) {
    return NextResponse.json(
      { error: 'Property title is required.' },
      { status: 400 }
    )
  }

  const columns = await getPropertiesColumns()
  const columnMap = new Map(columns.map((column) => [column.column_name, column]))

  const insertColumns: string[] = []
  const placeholders: string[] = []
  const values: unknown[] = []

  let paramIndex = 1

  for (const columnName of CANDIDATE_COLUMNS) {
    const column = columnMap.get(columnName)

    if (!column) continue

    let value: unknown

    if (
      ['seller_id', 'created_by', 'uploaded_by', 'user_id', 'owner_id'].includes(
        columnName
      )
    ) {
      value = actor.userId
    } else if (columnName === 'created_at' || columnName === 'updated_at') {
      insertColumns.push(quoteIdentifier(columnName))
      placeholders.push('now()')
      continue
    } else {
      value = getCoordinateValue(body, columnName)
    }

    if (!(columnName in body) && value === undefined) continue

    insertColumns.push(quoteIdentifier(columnName))
    placeholders.push(`$${paramIndex}`)
    values.push(normalizeValue(value, column.data_type))
    paramIndex += 1
  }

  if (insertColumns.length === 0) {
    return NextResponse.json(
      { error: 'No valid property fields found for insert.' },
      { status: 400 }
    )
  }

  const { rows } = await db.query<Record<string, any>>({
    text: `
      INSERT INTO properties (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `,
    values,
  })

  return NextResponse.json({
    ok: true,
    property: rows[0],
  })
}