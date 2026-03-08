import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface CascadeLog {
  id: string;
  feriado_data: string | null;
  feriado_nome: string | null;
  total_aulas_realocadas: number | null;
  detalhes: any;
  aplicado_em: string;
}

export const CascadeHistoryCard = () => {
  const { user } = useAuth();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["cascade_logs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cascade_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("aplicado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CascadeLog[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-primary" />
          Histórico de Realocações (Auto-Cascade)
        </CardTitle>
        <CardDescription className="text-xs">
          Últimas {logs.length} realocações automáticas aplicadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Aplicação</TableHead>
                <TableHead>Feriado</TableHead>
                <TableHead className="text-center">Aulas</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <>
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(parseISO(log.aplicado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.feriado_nome}</div>
                      {log.feriado_data && (
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(log.feriado_data), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{log.total_aulas_realocadas}</Badge>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(log.detalhes) && log.detalhes.length > 0 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          {expandedLog === log.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedLog === log.id && Array.isArray(log.detalhes) && (
                    <TableRow key={`${log.id}-details`}>
                      <TableCell colSpan={4} className="bg-muted/30 p-3">
                        <div className="space-y-1 text-xs">
                          {log.detalhes.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="font-medium">{d.turma}</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{d.disciplina}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-destructive line-through">{d.de}</span>
                              <span>→</span>
                              <span className="text-green-600 font-medium">{d.para}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
