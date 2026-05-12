import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

/** Bloqueia rotas para professores: redireciona para /attendance. */
export const AdminOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { isProfessor, isLoading } = useUserRole();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (isProfessor) return <Navigate to="/attendance" replace />;
  return <>{children}</>;
};