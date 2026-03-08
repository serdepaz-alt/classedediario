import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, BookOpen, Calendar } from "lucide-react";
import { PadroesMaracacoTab } from "@/components/admin/PadroesMaracacoTab";
import { CronogramasTab } from "@/components/admin/CronogramasTab";

const AdminPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Módulo Administrativo</h1>
            <p className="text-muted-foreground">Configurações e padrões do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="cronogramas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="padroes" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Padrões de Marcação
            </TabsTrigger>
            <TabsTrigger value="cronogramas" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cronogramas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="padroes" className="mt-6">
            <PadroesMaracacoTab />
          </TabsContent>

          <TabsContent value="cronogramas" className="mt-6">
            <CronogramasTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPage;
