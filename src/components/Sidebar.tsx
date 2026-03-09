import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AdminPasswordDialog } from "@/components/admin/AdminPasswordDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBacklog } from "@/hooks/useBacklog";
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
  ChevronRight,
  DollarSign,
  ClipboardCheck,
  ShieldAlert,
  Wallet,
  Bell
} from "lucide-react";

const mainMenuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: CalendarCheck, label: "Presença", path: "/attendance" },
  { icon: TrendingUp, label: "Notas", path: "/grades" },
  { icon: StickyNote, label: "Anotações", path: "/notes" },
];

const adminSubMenuItems = [
  { icon: FileText, label: "Conteúdo Programático", path: "/programmatic-content" },
  { icon: Bell, label: "Backlog", path: "/backlog" },
  { icon: BrainCircuit, label: "Análise Preditiva", path: "/predictive" },
  { icon: DollarSign, label: "Smart Finance", path: "/smart-finance" },
  { icon: ClipboardCheck, label: "Aceite Cronograma", path: "/aceite-cronograma" },
  { icon: ShieldAlert, label: "Gestão de Exceções", path: "/gestao-excecoes" },
  { icon: Wallet, label: "Pagamentos", path: "/payroll" },
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
  const { unreadCount } = useBacklog();
  
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
    <div className="fixed left-0 top-0 h-full w-64 gradient-card border-r border-border shadow-elevated flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 pb-4">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Diário de Classe</h1>
          <p className="text-sm text-muted-foreground">Sistema Educacional</p>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-6 space-y-2">
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
              {item.path === "/backlog" && unreadCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
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
                  {item.path === "/backlog" && unreadCount > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
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

      {/* Footer - Professor Panel */}
      <div className="p-6 pt-4 space-y-3 border-t border-border mt-auto">
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
