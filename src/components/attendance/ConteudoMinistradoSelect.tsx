import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AulaItem {
  id: string;
  topico: string;
  data_aula: string;
  objetivo: string | null;
}

interface Props {
  disciplinaId: string | null;
  disciplinaNome?: string | null;
  ownerUserId?: string | null;
  selectedDate: Date | undefined;
  value: string;
  onChange: (value: string) => void;
  ocorrencias: string;
  setOcorrencias: (value: string) => void;
}

const CONTEUDO_TAG = /^\[Conteúdo:[^\]]*\]\s*-\s*/;

export const ConteudoMinistradoSelect = ({
  disciplinaId,
  disciplinaNome,
  ownerUserId,
  selectedDate,
  value,
  onChange,
  ocorrencias,
  setOcorrencias,
}: Props) => {
  const { user } = useAuth();
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const effectiveOwnerId = ownerUserId || user?.id || null;

  // React Query — invalida automaticamente quando novas aulas são salvas
  // (mesma chave usada por useConteudoProgramaticoAulas)
  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["conteudo-programatico-aulas", effectiveOwnerId, "select", disciplinaId, disciplinaNome],
    queryFn: async (): Promise<AulaItem[]> => {
      if (!effectiveOwnerId || (!disciplinaId && !disciplinaNome)) return [];
      // Escopo estrito à disciplina ATIVA da turma:
      // - Se houver disciplina_id (vínculo direto), filtra exclusivamente por ele.
      // - Caso contrário, usa disciplina_nome como fallback (planos cadastrados só pelo Padrão de Marcação).
      let query = supabase
        .from("conteudo_programatico_aulas")
        .select("id, topico, data_aula, objetivo")
        .eq("user_id", effectiveOwnerId)
        .order("data_aula", { ascending: true });

      if (disciplinaId) {
        query = query.eq("disciplina_id", disciplinaId);
      } else if (disciplinaNome) {
        query = query.eq("disciplina_nome", disciplinaNome);
      }

      const { data, error } = await query;
      if (error) return [];
      return (data || []) as AulaItem[];
    },
    enabled: !!effectiveOwnerId && (!!disciplinaId || !!disciplinaNome),
  });

  // Sugestão: aula com data_aula igual à data selecionada
  const suggestedId = useMemo(() => {
    if (!dateStr || aulas.length === 0) return null;
    const exact = aulas.find((a) => a.data_aula === dateStr);
    return exact?.id ?? null;
  }, [aulas, dateStr]);

  // Auto-select quando há sugestão e nada selecionado ainda (ou data mudou)
  useEffect(() => {
    if (suggestedId && value !== suggestedId) {
      handleSelect(suggestedId, /* fromAuto */ true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedId]);

  const handleSelect = (id: string, fromAuto = false) => {
    onChange(id);
    const aula = aulas.find((a) => a.id === id);
    if (!aula) return;
    const prefix = `[Conteúdo: ${aula.topico}] - `;
    // Substitui prefixo existente preservando texto digitado
    const stripped = ocorrencias.replace(CONTEUDO_TAG, "");
    // Se foi auto e usuário ainda não digitou nada, apenas injeta o prefixo
    setOcorrencias(prefix + stripped);
  };

  const ordered = useMemo(() => {
    if (!suggestedId) return aulas;
    const top = aulas.find((a) => a.id === suggestedId);
    const rest = aulas.filter((a) => a.id !== suggestedId);
    return top ? [top, ...rest] : aulas;
  }, [aulas, suggestedId]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
        <BookOpen className="w-3.5 h-3.5" />
        Conteúdo Ministrado
      </Label>
      <Select
        value={value || undefined}
        onValueChange={(v) => handleSelect(v)}
        disabled={isLoading || (!disciplinaId && !disciplinaNome)}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Carregando conteúdo programático...
            </span>
          ) : (
            <SelectValue placeholder="Selecione ou confirme o conteúdo programático do dia..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {ordered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum plano de aula vinculado a esta disciplina.
            </div>
          ) : (
            ordered.map((a) => {
              const isSuggested = a.id === suggestedId;
              return (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-2">
                    {isSuggested && (
                      <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    )}
                    <span className="truncate">
                      {isSuggested ? "Sugerido — " : ""}
                      {a.topico}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({a.data_aula.split("-").reverse().join("/")})
                      </span>
                    </span>
                  </span>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      {!isLoading && aulas.length === 0 && (disciplinaId || disciplinaNome) && (
        <p className="text-[11px] text-muted-foreground">
          Nenhum plano de aula vinculado a esta disciplina.
        </p>
      )}
    </div>
  );
};
