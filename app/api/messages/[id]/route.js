import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

export async function DELETE(_req, { params }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'Server env not set' }, { status: 500 })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await admin.from('messages').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

