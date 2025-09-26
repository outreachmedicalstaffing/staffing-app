'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MessageList() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    // Load initial messages
    fetchMessages()

    // Subscribe to new inserts in real-time
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((current) => [payload.new, ...current])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    setMessages(data || [])
  }
async function handleDelete(id) {
  await fetch(`/api/messages/${id}`, { method: 'DELETE' })
  setMessages(cur => cur.filter(m => m.id !== id))
}

  return (
    <ul>
      {messages.map((msg) => (
        <li key={msg.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
  <span>{msg.content}</span>
  <button onClick={() => handleDelete(msg.id)}>Delete</button>
</li>

      ))}
    </ul>
  )
}
