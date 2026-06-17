import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "professor" | "moderator" | "user";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchRole = async () => {
      if (!user) {
        if (active) {
          setRole(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!active) return;
      const roles = (data ?? []).map((r: any) => r.role as AppRole);

      // Fallback: if email matches a registered administrator, grant admin role
      let isAdminByEmail = false;
      if (!roles.includes("admin") && user.email) {
        const { data: adm } = await supabase
          .from("cad_administradores")
          .select("id")
          .ilike("email", user.email.toLowerCase().trim())
          .limit(1)
          .maybeSingle();
        if (!active) return;
        isAdminByEmail = !!adm;
      }

      // Priority: admin > professor
      if (roles.includes("admin") || isAdminByEmail) setRole("admin");
      else if (roles.includes("professor")) setRole("professor");
      else if (roles.length > 0) setRole(roles[0]);
      else setRole(null);
      setLoading(false);
    };
    if (!authLoading) fetchRole();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return {
    role,
    loading: loading || authLoading,
    isProfessor: role === "professor",
    isAdmin: role === "admin" || role === null, // fallback admin if no role assigned (owner accounts)
  };
};