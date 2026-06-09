import { Layout } from "@/components/Layout";
import { AtestadoMatricula } from "@/components/atestado/AtestadoMatricula";

const AtestadoMatriculaPage = () => {
  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Atestado de Matrícula</h1>
          <p className="text-sm text-muted-foreground">
            Edite o cabeçalho institucional, o corpo e a assinatura. As alterações
            são salvas automaticamente neste navegador.
          </p>
        </div>
        <AtestadoMatricula />
      </div>
    </Layout>
  );
};

export default AtestadoMatriculaPage;