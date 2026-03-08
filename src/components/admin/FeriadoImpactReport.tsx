import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeriados } from "@/hooks/useFeriados";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AulaEmFeriado {
  id: string;
  data_aula: string;
  turma_nome: string;
  disciplina_nome: string;
  professor_nome: string;
  feriado_nome: string;
}

export const FeriadoImpactReport = () => {
  const { user } = useAuth();
  const { feriados } = useFeriados();

  const feriadoDates = feriados.map((f) => f.data);
  const feriadoMap = Object.fromEntries(feriados.map((f) => [f.data, f.nome]));

  const { data: aulasEmFeriado = [], isLoading } = useQuery({
    queryKey: ["aulas-em-feriado", user?.id, feriadoDates],
    queryFn: async () => {
      if (!user?.id || feriadoDates.length === 0) return [];

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, data_aula,
          turma:turmas(nome),
          disciplina:cad_disciplinas(nome),
          professor:cad_professores(nome)
        `)
        .eq("user_id", user.id)
        .in("data_aula", feriadoDates)
        .not("status_aula", "in", '("Realizada","Cancelada")');

      if (error) throw error;

      return (data || []).map((a: any) => ({
        id: a.id,
        data_aula: a.data_aula,
        turma_nome: a.turma?.nome || "—",
        disciplina_nome: a.disciplina?.nome || "—",
        professor_nome: a.professor?.nome || "—",
        feriado_nome: feriadoMap[a.data_aula] || "Feriado",
      }));
    },
    enabled: !!user?.id && feriadoDates.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {aulasEmFeriado.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          Relatório de Impacto de Feriados
        </CardTitle>
        <CardDescription className="text-xs">
          {aulasEmFeriado.length > 0
            ? `${aulasEmFeriado.length} aula(s) agendada(s) em datas de feriados não realocadas`
            : "Nenhuma aula em conflito com feriados cadastrados"}
        </CardDescription>
      </CardHeader>
      {aulasEmFeriado.length > 0 && (
        <CardContent>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {aulasEmFeriado.map((aula) => (
              <div
                key={aula.id}
                className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{aula.turma_nome}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{aula.disciplina_nome}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Prof. {aula.professor_nome}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 text-xs">
                    {format(parseISO(aula.data_aula), "dd/MM", { locale: ptBR })} — {aula.feriado_nome}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
