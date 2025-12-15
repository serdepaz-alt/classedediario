import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Upload } from "lucide-react";
import { IndividualStudentForm, StudentData } from "./IndividualStudentForm";
import { ImportStudentsList } from "./ImportStudentsList";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  student?: StudentData | null;
}

export const AddStudentDialog = ({ open, onOpenChange, onSuccess, student }: AddStudentDialogProps) => {
  const [activeTab, setActiveTab] = useState("individual");
  const isEditing = !!student;

  // Reset to individual tab when opening for edit
  useEffect(() => {
    if (open && isEditing) {
      setActiveTab("individual");
    }
  }, [open, isEditing]);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "Editar Estudante" : "Adicionar Estudante"}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <IndividualStudentForm 
            onCancel={() => onOpenChange(false)} 
            onSuccess={handleSuccess}
            student={student}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Novo Estudante
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Novos Estudantes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual">
              <IndividualStudentForm 
                onCancel={() => onOpenChange(false)} 
                onSuccess={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="import">
              <ImportStudentsList 
                onCancel={() => onOpenChange(false)} 
                onSuccess={handleSuccess}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
