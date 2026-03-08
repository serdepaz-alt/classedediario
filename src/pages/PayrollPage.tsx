import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabelaValoresView } from "@/components/payroll/TabelaValoresView";
import { EstagiosValoresView } from "@/components/payroll/EstagiosValoresView";
import { AuditoriaDirecaoView } from "@/components/payroll/AuditoriaDirecaoView";
import { AdminAuthDialog } from "@/components/attendance/AdminAuthDialog";
import { DollarSign, Building2, Shield } from "lucide-react";

const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState("valores");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [directionUnlocked, setDirectionUnlocked] = useState(false);

  const handleTabChange = (value: string) => {
    if (value === "auditoria" && !directionUnlocked) {
      setShowAuthDialog(true);
      return;
    }
    setActiveTab(value);
  };

  const handleAuthSuccess = () => {
    setDirectionUnlocked(true);
    setActiveTab("auditoria");
    setShowAuthDialog(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Tabelas de valores, estágios e auditoria financeira</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="valores" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Valores Hora</TabsTrigger>
            <TabsTrigger value="estagios" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Estágios</TabsTrigger>
            <TabsTrigger value="auditoria" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="valores"><TabelaValoresView /></TabsContent>
          <TabsContent value="estagios"><EstagiosValoresView /></TabsContent>
          <TabsContent value="auditoria">{directionUnlocked && <AuditoriaDirecaoView />}</TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>Última Atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <span>Módulo de Governança Financeira v2.0</span>
        </div>
      </div>

      <AdminAuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
    </Layout>
  );
};

export default PayrollPage;
