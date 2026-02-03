import { Layout } from "@/components/Layout";
import { ProfessoresList } from "@/components/professores/ProfessoresList";
import { UserCheck } from "lucide-react";

const ProfessoresPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Professores</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de professores e seus valores
            </p>
          </div>
        </div>

        <ProfessoresList />
      </div>
    </Layout>
  );
};

export default ProfessoresPage;
