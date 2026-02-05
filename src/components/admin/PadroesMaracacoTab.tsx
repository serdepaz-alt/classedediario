import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Calculator, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Disciplina {
  id: string;
  nome: string;
  cargaTotal: number;
  cargaDiaria: number;
  qtdDias: number;
}

// Seed data
const seedDataMatutino: Omit<Disciplina, 'id' | 'qtdDias'>[] = [
  { nome: "Anatomia", cargaTotal: 81, cargaDiaria: 3 },
  { nome: "Microbiologia", cargaTotal: 51, cargaDiaria: 3 },
];

const seedDataNoturnoIntermediario: Omit<Disciplina, 'id' | 'qtdDias'>[] = [
  { nome: "Anatomia", cargaTotal: 80, cargaDiaria: 2 },
  { nome: "Microbiologia", cargaTotal: 50, cargaDiaria: 2 },
  { nome: "Higiene", cargaTotal: 30, cargaDiaria: 2 },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const calcularQtdDias = (cargaTotal: number, cargaDiaria: number): number => {
  if (cargaDiaria <= 0) return 0;
  return Math.ceil(cargaTotal / cargaDiaria);
};

const getCargaDiariaSugerida = (turno: string, nomeDisciplina: string): number => {
  // Se for Estágio, força 5h
  if (nomeDisciplina.toLowerCase().includes("estágio")) {
    return 5;
  }
  
  // Regras por turno
  if (turno === "Matutino") {
    return 3;
  }
  
  // Noturno ou Intermediário
  return 2;
};

export const PadroesMaracacoTab = () => {
  const [turnoSelecionado, setTurnoSelecionado] = useState<string>("Matutino");
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Carregar seed data baseado no turno
  useEffect(() => {
    const seedData = turnoSelecionado === "Matutino" 
      ? seedDataMatutino 
      : seedDataNoturnoIntermediario;

    const disciplinasComCalculo = seedData.map(d => ({
      ...d,
      id: generateId(),
      qtdDias: calcularQtdDias(d.cargaTotal, d.cargaDiaria),
    }));

    setDisciplinas(disciplinasComCalculo);
  }, [turnoSelecionado]);

  const handleAddDisciplina = () => {
    const cargaDiariaSugerida = getCargaDiariaSugerida(turnoSelecionado, "");
    const novaDisciplina: Disciplina = {
      id: generateId(),
      nome: "",
      cargaTotal: 0,
      cargaDiaria: cargaDiariaSugerida,
      qtdDias: 0,
    };
    setDisciplinas([...disciplinas, novaDisciplina]);
    setEditingId(novaDisciplina.id);
  };

  const handleRemoveDisciplina = (id: string) => {
    setDisciplinas(disciplinas.filter(d => d.id !== id));
    toast.success("Disciplina removida");
  };

  const handleUpdateDisciplina = (id: string, field: keyof Disciplina, value: string | number) => {
    setDisciplinas(disciplinas.map(d => {
      if (d.id !== id) return d;

      let updatedDisciplina = { ...d, [field]: value };

      // Se mudou o nome, verificar se é Estágio
      if (field === "nome" && typeof value === "string") {
        const novaCargaDiaria = getCargaDiariaSugerida(turnoSelecionado, value);
        if (value.toLowerCase().includes("estágio")) {
          updatedDisciplina.cargaDiaria = 5; // Força 5h para Estágio
          toast.info("Disciplina 'Estágio' detectada: Carga Diária fixada em 5h");
        }
      }

      // Recalcular qtdDias sempre que cargaTotal ou cargaDiaria mudar
      if (field === "cargaTotal" || field === "cargaDiaria") {
        updatedDisciplina.qtdDias = calcularQtdDias(
          field === "cargaTotal" ? Number(value) : updatedDisciplina.cargaTotal,
          field === "cargaDiaria" ? Number(value) : updatedDisciplina.cargaDiaria
        );
      }

      return updatedDisciplina;
    }));
  };

  const handleSave = () => {
    const disciplinasValidas = disciplinas.filter(d => d.nome.trim() !== "" && d.cargaTotal > 0);
    if (disciplinasValidas.length < disciplinas.length) {
      toast.warning("Algumas disciplinas incompletas foram mantidas. Preencha todos os campos.");
      return;
    }
    toast.success("Padrões salvos com sucesso!");
    setEditingId(null);
  };

  const totalHoras = useMemo(() => 
    disciplinas.reduce((acc, d) => acc + d.cargaTotal, 0), 
    [disciplinas]
  );

  const totalDias = useMemo(() => 
    disciplinas.reduce((acc, d) => acc + d.qtdDias, 0), 
    [disciplinas]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Padrões de Marcação por Disciplina
            </CardTitle>
            <CardDescription>
              Configure as cargas horárias padrão para cada disciplina por turno
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total:</span>
              <Badge variant="secondary">{totalHoras}h</Badge>
              <Badge variant="outline">{totalDias} dias</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro de Turno */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Selecione o Turno:</label>
          <Select value={turnoSelecionado} onValueChange={setTurnoSelecionado}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matutino">Matutino (3h/dia)</SelectItem>
              <SelectItem value="Noturno">Noturno (2h/dia)</SelectItem>
              <SelectItem value="Intermediário">Intermediário (2h/dia)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-2">
            <Calculator className="w-3 h-3 mr-1" />
            Carga sugerida: {turnoSelecionado === "Matutino" ? "3h" : "2h"}/dia
          </Badge>
        </div>

        {/* Tabela Editável */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Nome da Disciplina</TableHead>
                <TableHead className="w-[150px] text-center">Carga Total (h)</TableHead>
                <TableHead className="w-[150px] text-center">Carga Diária (h)</TableHead>
                <TableHead className="w-[120px] text-center">Qtd. Dias</TableHead>
                <TableHead className="w-[80px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disciplinas.map((disciplina) => {
                const isEstagio = disciplina.nome.toLowerCase().includes("estágio");
                
                return (
                  <TableRow key={disciplina.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Input
                        value={disciplina.nome}
                        onChange={(e) => handleUpdateDisciplina(disciplina.id, "nome", e.target.value)}
                        placeholder="Nome da disciplina"
                        className="border-0 bg-transparent focus-visible:ring-1"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={disciplina.cargaTotal || ""}
                        onChange={(e) => handleUpdateDisciplina(disciplina.id, "cargaTotal", Number(e.target.value))}
                        placeholder="0"
                        className="border-0 bg-transparent focus-visible:ring-1 text-center w-20 mx-auto"
                        min={0}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          value={disciplina.cargaDiaria || ""}
                          onChange={(e) => handleUpdateDisciplina(disciplina.id, "cargaDiaria", Number(e.target.value))}
                          placeholder="0"
                          className="border-0 bg-transparent focus-visible:ring-1 text-center w-20"
                          min={1}
                          disabled={isEstagio}
                        />
                        {isEstagio && (
                          <Badge variant="secondary" className="text-xs">Fixo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {disciplina.qtdDias}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDisciplina(disciplina.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {disciplinas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma disciplina cadastrada. Clique em "Adicionar" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={handleAddDisciplina}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Disciplina
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Padrões
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm mb-2">📋 Regras de Negócio Aplicadas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Qtd. Dias</strong> = Carga Total ÷ Carga Diária (arredondado para cima)</li>
            <li>• <strong>Matutino:</strong> Sugere carga diária de 3h</li>
            <li>• <strong>Noturno/Intermediário:</strong> Sugere carga diária de 2h</li>
            <li>• <strong>Estágio:</strong> Força carga diária de 5h (sempre)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
