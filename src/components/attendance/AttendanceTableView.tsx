import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  History,
} from "lucide-react";

interface Student {
  id: string;
  nome: string;
  matricula: string;
  email?: string | null;
}

interface AttendanceTableViewProps {
  students: Student[];
  presencas: Map<string, string>;
  justificativas: Map<string, string>;
  setStatus: (studentId: string, status: string) => void;
  setJustificativa: (studentId: string, justificativa: string) => void;
  selectedStudents: Set<string>;
  toggleStudentSelection: (studentId: string) => void;
  toggleSelectAll: (visibleStudentIds: string[]) => void;
  studentsAtRisk: Map<string, { absences: number; lates: number }>;
  onViewHistory: (student: Student) => void;
  searchQuery: string;
}

export const AttendanceTableView = ({
  students,
  presencas,
  justificativas,
  setStatus,
  setJustificativa,
  selectedStudents,
  toggleStudentSelection,
  toggleSelectAll,
  studentsAtRisk,
  onViewHistory,
  searchQuery,
}: AttendanceTableViewProps) => {
  const filteredStudents = students.filter((s) =>
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusButton = (
    studentId: string,
    status: string,
    currentStatus: string,
    icon: React.ReactNode,
    label: string,
    colorClass: string
  ) => {
    const isActive = currentStatus === status;
    return (
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        className={`h-8 w-8 p-0 ${isActive ? colorClass : ""}`}
        onClick={() => setStatus(studentId, status)}
        title={label}
      >
        {icon}
      </Button>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40px]">
              <Checkbox
                checked={
                  filteredStudents.length > 0 &&
                  filteredStudents.every((s) => selectedStudents.has(s.id))
                }
                onCheckedChange={() => toggleSelectAll(filteredStudents.map((s) => s.id))}
              />
            </TableHead>
            <TableHead className="min-w-[200px]">Aluno</TableHead>
            <TableHead className="w-[100px]">Matrícula</TableHead>
            <TableHead className="w-[150px] text-center">Status</TableHead>
            <TableHead className="w-[60px] text-center">P</TableHead>
            <TableHead className="w-[60px] text-center">A</TableHead>
            <TableHead className="w-[60px] text-center">T</TableHead>
            <TableHead className="w-[80px]">Just.</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.map((student) => {
            const currentStatus = presencas.get(student.id) || "presente";
            const riskData = studentsAtRisk.get(student.id);
            const isAtRisk = riskData && (riskData.absences >= 2 || riskData.lates >= 3);
            const justificativa = justificativas.get(student.id) || "";

            return (
              <TableRow
                key={student.id}
                className={`${
                  currentStatus === "presente"
                    ? "bg-green-50/30 dark:bg-green-950/10"
                    : currentStatus === "ausente"
                    ? "bg-red-50/30 dark:bg-red-950/10"
                    : currentStatus === "atrasado"
                    ? "bg-yellow-50/30 dark:bg-yellow-950/10"
                    : ""
                }`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedStudents.has(student.id)}
                    onCheckedChange={() => toggleStudentSelection(student.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{student.nome}</span>
                    {isAtRisk && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Risco
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {student.matricula}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      currentStatus === "presente"
                        ? "default"
                        : currentStatus === "ausente"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {currentStatus === "presente"
                      ? "Presente"
                      : currentStatus === "ausente"
                      ? "Ausente"
                      : "Atrasado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusButton(
                    student.id,
                    "presente",
                    currentStatus,
                    <CheckCircle className="w-4 h-4" />,
                    "Presente",
                    "bg-green-500 hover:bg-green-600"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusButton(
                    student.id,
                    "ausente",
                    currentStatus,
                    <XCircle className="w-4 h-4" />,
                    "Ausente",
                    "bg-red-500 hover:bg-red-600"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusButton(
                    student.id,
                    "atrasado",
                    currentStatus,
                    <Clock className="w-4 h-4" />,
                    "Atrasado",
                    "bg-yellow-500 hover:bg-yellow-600"
                  )}
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${justificativa ? "text-primary" : ""}`}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Justificativa</p>
                        <Textarea
                          placeholder="Atestado médico, motivo da falta..."
                          value={justificativa}
                          onChange={(e) => setJustificativa(student.id, e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onViewHistory(student)}
                    title="Ver histórico"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
