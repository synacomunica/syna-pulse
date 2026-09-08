import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  fullName: string;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    let active = true;

    const load = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      if (!s?.user) {
        setIsAdmin(false);
        setFullName("");
        setLoading(false);
        return;
      }
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", s.user.id),
        supabase.from("profiles").select("full_name").eq("id", s.user.id).maybeSingle(),
      ]);
      if (!active) return;
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setFullName(profile?.full_name ?? s.user.email ?? "");
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => void load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void load(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user: session?.user ?? null,
    session,
    loading,
    isAdmin,
    fullName,
  };
}
