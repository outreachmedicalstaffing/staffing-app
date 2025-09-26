import { supabase } from '@/lib/supabaseClient'
import AddMessage from './components/AddMessage'   // 👈 add this line
import MessageList from './components/MessageList'

export default async function Home() {
    const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })  // 👈 newest messages first
    .limit(5)


  return (
  <main>
    <h1>Hello Supabase 👋</h1>
    <AddMessage />   {/* input + Add button */}
    <MessageList />  {/* 👈 new live messages list */}
  </main>
)

}


