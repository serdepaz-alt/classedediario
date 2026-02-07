import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AdminPasswordDialog } from "@/components/admin/AdminPasswordDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  StickyNote,
  Home,
  GraduationCap,
  FileText,
  LogOut,
  Layers,
  BrainCircuit,
  UserCheck,
  CalendarClock,
  Settings,
  ChevronDown,
  ChevronRight
} from "lucide-react";

const mainMenuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: CalendarCheck, label: "Presença", path: "/attendance" },
  { icon: TrendingUp, label: "Notas", path: "/grades" },
  { icon: StickyNote, label: "Anotações", path: "/notes" },
  { icon: FileText, label: "Conteúdo Programático", path: "/programmatic-content" },
];

const adminSubMenuItems = [
  { icon: BrainCircuit, label: "Análise Preditiva", path: "/predictive" },
  { icon: CalendarClock, label: "Cronograma", path: "/cronograma" },
  { icon: Layers, label: "Turmas", path: "/turmas" },
  { icon: UserCheck, label: "Professores", path: "/professores" },
  { icon: Users, label: "Estudantes", path: "/students" },
  { icon: Settings, label: "Configurações", path: "/admin", requiresAuth: true },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  
  // Check if any admin submenu is active
  const isAdminSectionActive = adminSubMenuItems.some(item => location.pathname === item.path);
  const [isAdminOpen, setIsAdminOpen] = useState(isAdminSectionActive);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAdminItemClick = (item: typeof adminSubMenuItems[0], e: React.MouseEvent) => {
    if (item.requiresAuth) {
      e.preventDefault();
      setPendingPath(item.path);
      setShowAdminDialog(true);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 gradient-card border-r border-border p-6 shadow-elevated overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Diário de Classe</h1>
          <p className="text-sm text-muted-foreground">Sistema Educacional</p>
        </div>
      </div>

      <nav className="space-y-2">
        {/* Main Menu Items */}
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin Collapsible Menu */}
        <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-smooth text-sm font-medium",
                isAdminSectionActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                Administrativo
              </div>
              {isAdminOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {adminSubMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              if (item.requiresAuth) {
                return (
                  <button
                    key={item.path}
                    onClick={(e) => handleAdminItemClick(item, e)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-smooth text-sm font-medium w-full text-left",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-smooth text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <AdminPasswordDialog 
        open={showAdminDialog} 
        onOpenChange={setShowAdminDialog} 
      />

      <div className="absolute bottom-6 left-6 right-6 space-y-3">
        <div className="gradient-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-foreground">
                {user?.email?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email || 'Professor'}
              </p>
              <p className="text-xs text-muted-foreground">Sistema Ativo</p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};
