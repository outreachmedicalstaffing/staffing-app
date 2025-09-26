"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Supabase takes the code from the URL and trades it for a session
      await supabase.auth.exchangeCodeForSession(window.location.href);
      router.replace("/"); // send the user back to the home page
    })();
  }, [router]);

  return <p>Signing you in…</p>;
}
