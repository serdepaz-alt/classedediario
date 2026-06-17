import { Construction } from "lucide-react";

const EmConstrucaoPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border bg-card shadow-lg">
      <Construction className="w-16 h-16 mx-auto text-primary" />
      <h1 className="text-3xl font-bold text-foreground">Em construção</h1>
      <p className="text-muted-foreground">
        O Portal do Aluno está sendo preparado. Em breve você poderá acessar
        todos os detalhes da sua evolução pedagógica por aqui.
      </p>
    </div>
  </div>
);

export default EmConstrucaoPage;