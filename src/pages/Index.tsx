import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { isProfessor, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfessor) {
    return <Navigate to="/attendance" replace />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

export default Index;