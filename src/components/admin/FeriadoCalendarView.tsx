import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Feriado } from "@/hooks/useFeriados";

interface FeriadoCalendarViewProps {
  feriados: Feriado[];
}

export const FeriadoCalendarView = ({ feriados }: FeriadoCalendarViewProps) => {
  const [month, setMonth] = useState<Date>(new Date());

  const feriadosByDate = useMemo(() => {
    const map: Record<string, Feriado[]> = {};
    feriados.forEach((f) => {
      if (!map[f.data]) map[f.data] = [];
      map[f.data].push(f);
    });
    return map;
  }, [feriados]);

  const feriadoDates = useMemo(
    () => feriados.map((f) => parseISO(f.data)),
    [feriados]
  );

  const tipoColor = (tipo: string | null) => {
    switch (tipo) {
      case "feriado": return "bg-destructive/20 text-destructive border-destructive/30";
      case "recesso": return "bg-orange-500/20 text-orange-700 border-orange-500/30";
      case "ponto_facultativo": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const tipoLabel = (tipo: string | null) => {
    switch (tipo) {
      case "feriado": return "Feriado";
      case "recesso": return "Recesso";
      case "ponto_facultativo": return "Ponto Facultativo";
      default: return "Feriado";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Calendar
        mode="multiple"
        selected={feriadoDates}
        month={month}
        onMonthChange={setMonth}
        locale={ptBR}
        modifiers={{
          feriado: feriadoDates.filter((d) => {
            const key = format(d, "yyyy-MM-dd");
            return feriadosByDate[key]?.some((f) => f.tipo === "feriado");
          }),
          recesso: feriadoDates.filter((d) => {
            const key = format(d, "yyyy-MM-dd");
            return feriadosByDate[key]?.some((f) => f.tipo === "recesso");
          }),
          facultativo: feriadoDates.filter((d) => {
            const key = format(d, "yyyy-MM-dd");
            return feriadosByDate[key]?.some((f) => f.tipo === "ponto_facultativo");
          }),
        }}
        modifiersClassNames={{
          feriado: "!bg-destructive/20 !text-destructive font-bold",
          recesso: "!bg-orange-500/20 !text-orange-700 font-bold",
          facultativo: "!bg-yellow-500/20 !text-yellow-700 font-bold",
        }}
        className="rounded-md border"
      />
      <div className="flex gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-destructive/30" />
          <span>Feriado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/30" />
          <span>Recesso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/30" />
          <span>Ponto Facultativo</span>
        </div>
      </div>

      {/* Lista resumida ao lado */}
      <div className="mt-4 w-full space-y-1 max-h-[200px] overflow-y-auto">
        {feriados
          .filter((f) => {
            const d = parseISO(f.data);
            return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
          })
          .map((f) => (
            <div key={f.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/40">
              <span>{format(parseISO(f.data), "dd/MM")} — {f.nome}</span>
              <Badge variant="outline" className={`text-[10px] ${tipoColor(f.tipo)}`}>
                {tipoLabel(f.tipo)}
              </Badge>
            </div>
          ))}
      </div>
    </div>
  );
};
