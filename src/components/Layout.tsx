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

export const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  // No mobile, ocultar o menu por padrão em todas as rotas para maximizar a área útil.
  const shouldAutoHide = isMobile;

  const [hidden, setHidden] = useState(shouldAutoHide);

  // Reavalia ao trocar de rota ou ao alternar viewport
  useEffect(() => {
    setHidden(shouldAutoHide);
  }, [shouldAutoHide, pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {!hidden && <Sidebar />}

      {/* Botão flutuante para reexibir/ocultar o menu no mobile */}
      {isMobile && (
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