import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

// Rotas onde, no mobile, o menu deve ficar oculto por padrão para maximizar
// área de trabalho ao cadastrar presença ou notas.
const FOCUS_ROUTES = ["/attendance", "/grades"];

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const isFocusRoute = FOCUS_ROUTES.some((r) => pathname.startsWith(r));
  const shouldAutoHide = isMobile && isFocusRoute;

  const [hidden, setHidden] = useState(shouldAutoHide);

  // Reavalia ao trocar de rota ou ao alternar viewport
  useEffect(() => {
    setHidden(shouldAutoHide);
  }, [shouldAutoHide, pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {!hidden && <Sidebar />}

      {/* Botão flutuante para reexibir/ocultar o menu no mobile nas rotas de foco */}
      {isMobile && isFocusRoute && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setHidden((h) => !h)}
          className="fixed top-3 left-3 z-50 shadow-elevated"
          aria-label={hidden ? "Mostrar menu" : "Ocultar menu"}
        >
          {hidden ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      )}

      <main
        className={cn(
          "flex-1 p-6 transition-all",
          hidden ? "ml-0 pt-16" : "ml-64"
        )}
      >
        {children}
      </main>
    </div>
  );
};