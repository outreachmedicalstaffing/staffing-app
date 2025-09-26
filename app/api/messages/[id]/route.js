import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

export async function DELETE(_req, { params }) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin.from('messages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
