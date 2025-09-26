import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'Server env not set' }, { status: 500 })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  try {
    const { content } = await req.json()
    if (!content || typeof content !== 'string') return NextResponse.json({ error: 'content required' }, { status: 400 })
    const { error } = await admin.from('messages').insert({ content })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

