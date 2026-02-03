import { Layout } from "@/components/Layout";
import { CronogramaView } from "@/components/cronograma/CronogramaView";
import { CalendarClock } from "lucide-react";

const CronogramaPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Cronograma Mestre
            </h1>
            <p className="text-muted-foreground">
              Visualização e gestão de aulas por turma e professor
            </p>
          </div>
        </div>

        <CronogramaView />
      </div>
    </Layout>
  );
};

export default CronogramaPage;
