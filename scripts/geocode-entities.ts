/**
 * Geocode all companies and suppliers using Google Places Text Search API.
 * Writes lat/lng back into Supabase.
 *
 * Usage:
 *   pnpm tsx scripts/geocode-entities.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!

if (!SUPABASE_URL || !SERVICE_KEY || !MAPS_KEY) {
  console.error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY'
  )
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─── Google Places Text Search ────────────────────────────────────────────────

interface PlacesResult {
  lat: number
  lng: number
  formattedAddress: string
}

async function geocode(
  name: string,
  hint: string
): Promise<PlacesResult | null> {
  const query = encodeURIComponent(`${name} ${hint}`)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${MAPS_KEY}`

  const res = await fetch(url)
  if (!res.ok) return null

  const json = (await res.json()) as {
    status: string
    results: Array<{
      geometry: { location: { lat: number; lng: number } }
      formatted_address: string
    }>
  }

  if (json.status !== 'OK' || !json.results[0]) return null

  const loc = json.results[0].geometry.location
  return {
    lat: loc.lat,
    lng: loc.lng,
    formattedAddress: json.results[0].formatted_address,
  }
}

// ─── Rate-limited batch helper ────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocodeAll<T extends { id: number; name: string }>(
  entities: T[],
  hint: string,
  table: 'company' | 'supplier'
): Promise<void> {
  console.log(`\n📍 Geocoding ${entities.length} ${table} entries…\n`)

  let hits = 0
  let misses = 0

  for (const entity of entities) {
    const result = await geocode(entity.name, hint)

    if (result) {
      const { error } = await supabase
        .from(table)
        .update({ lat: result.lat, lng: result.lng } as never)
        .eq('id', entity.id)

      if (error) {
        console.log(
          `  ✗ [${entity.id}] ${entity.name}: DB error — ${error.message}`
        )
      } else {
        console.log(
          `  ✓ [${entity.id}] ${entity.name} → ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}  (${result.formattedAddress})`
        )
        hits++
      }
    } else {
      console.log(`  — [${entity.id}] ${entity.name}: no result`)
      misses++
    }

    // Stay well under Google's 10 QPS limit
    await sleep(120)
  }

  console.log(`\n  ${table}: ${hits} geocoded, ${misses} not found\n`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌍 Spherecast geocoding script\n')

  const { data: companies, error: cErr } = await supabase
    .from('company')
    .select('id, name')
    .is('lat', null)
    .order('name')

  const { data: suppliers, error: sErr } = await supabase
    .from('supplier')
    .select('id, name')
    .is('lat', null)
    .order('name')

  if (cErr) throw cErr
  if (sErr) throw sErr

  const typedCompanies = (companies ?? []) as Array<{
    id: number
    name: string
  }>
  const typedSuppliers = (suppliers ?? []) as Array<{
    id: number
    name: string
  }>

  console.log(`Found ${typedCompanies.length} companies without coordinates`)
  console.log(`Found ${typedSuppliers.length} suppliers without coordinates`)

  await geocodeAll(typedCompanies, 'nutrition brand company', 'company')
  await geocodeAll(typedSuppliers, 'ingredient supplier company', 'supplier')

  // Summary
  const { count: geocodedCompanies } = await supabase
    .from('company')
    .select('*', { count: 'exact', head: true })
    .not('lat', 'is', null)
  const { count: geocodedSuppliers } = await supabase
    .from('supplier')
    .select('*', { count: 'exact', head: true })
    .not('lat', 'is', null)

  console.log('─'.repeat(50))
  console.log(`✅ Done!`)
  console.log(`   Companies geocoded: ${geocodedCompanies}`)
  console.log(`   Suppliers geocoded: ${geocodedSuppliers}`)
  console.log('─'.repeat(50))
}

main().catch((err) => {
  console.error('\n❌ Geocoding failed:', err)
  process.exit(1)
})
