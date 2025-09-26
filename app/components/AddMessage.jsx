'use client'

import { useState } from 'react'

export default function AddMessage() {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Saving...')
    const res = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content })
})

if (!res.ok) {
  const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
  setStatus(`Error: ${error}`)
} else {
  setStatus('Saved!')
  setContent('')
  window.location.reload()
}

    if (error) {
      setStatus(`Error: ${error.message}`)
    } else {
      setStatus('Saved!')
      setContent('')
      window.location.reload()
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', gap:8, marginBottom:16 }}>
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message…"
        style={{ padding:8, flex:1 }}
        required
      />
      <button type="submit" style={{ padding:8 }}>Add</button>
      <span>{status}</span>
    </form>
  )
}
