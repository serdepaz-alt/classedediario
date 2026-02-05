import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Construction } from "lucide-react";

export const CronogramasTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Gestão de Cronogramas
        </CardTitle>
        <CardDescription>
          Configure e gerencie os cronogramas de aulas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Em Desenvolvimento</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Este módulo está sendo implementado. Em breve você poderá configurar 
            padrões de cronogramas, definir períodos letivos e automatizar a geração de aulas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
