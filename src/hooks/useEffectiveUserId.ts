import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Retorna o user_id efetivo a ser usado nas queries:
 * - Para administradores: o próprio user.id
 * - Para professores: o admin_user_id ao qual estão vinculados (dono dos dados)
 */
export const useEffectiveUserId = () => {
  const { user } = useAuth();
  const { isProfessor } = useUserRole();

  const { data: adminId } = useQuery({
    queryKey: ["effective-user-id", user?.id],
    enabled: !!user?.id && isProfessor,
    queryFn: async () => {
      const { data } = await supabase
        .from("professor_logins")
        .select("admin_user_id")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      return data?.admin_user_id ?? null;
    },
  });

  if (isProfessor) return adminId ?? null;
  return user?.id ?? null;
};