import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AdminPasswordDialog } from "@/components/admin/AdminPasswordDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBacklog } from "@/hooks/useBacklog";
import { 
  BookOpen, Users, CalendarCheck, TrendingUp, StickyNote,
  Home, GraduationCap, FileText, LogOut, Layers, BrainCircuit,
  UserCheck, CalendarClock, CalendarRange, ChevronDown, ChevronRight,
  DollarSign, ClipboardCheck, ShieldAlert, Wallet, Bell
} from "lucide-react";

const mainMenuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: CalendarCheck, label: "Presença", path: "/attendance" },
  { icon: TrendingUp, label: "Notas", path: "/grades" },
  { icon: StickyNote, label: "Anotações", path: "/notes" },
];

const adminSubMenuItems = [
  { icon: Bell, label: "Backlog", path: "/backlog" },
  { icon: ShieldAlert, label: "Gestão de Exceções", path: "/gestao-excecoes" },
  { icon: CalendarClock, label: "Cronograma", path: "/cronograma" },
  { icon: CalendarRange, label: "Cronogramas/Feriados", path: "/admin", requiresAuth: true },
];

const financeSubMenuItems = [
  { icon: BrainCircuit, label: "Análise Preditiva", path: "/predictive" },
  { icon: DollarSign, label: "Smart Finance", path: "/smart-finance" },
  { icon: Wallet, label: "Pagamentos", path: "/payroll" },
];

const pedagogicoSubMenuItems = [
  { icon: FileText, label: "Conteúdo Programático", path: "/programmatic-content" },
  { icon: ClipboardCheck, label: "Aceite Cronograma", path: "/aceite-cronograma" },
  { icon: Layers, label: "Turmas", path: "/turmas" },
  { icon: UserCheck, label: "Professores", path: "/professores" },
  { icon: Users, label: "Estudantes", path: "/students" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const { unreadCount } = useBacklog();
  
  const isFinanceSectionActive = financeSubMenuItems.some(item => location.pathname === item.path);
  const isPedagogicoSectionActive = pedagogicoSubMenuItems.some(item => location.pathname === item.path);
  const isAdminSectionActive = adminSubMenuItems.some(item => location.pathname === item.path) || isFinanceSectionActive || isPedagogicoSectionActive;
  const [isAdminOpen, setIsAdminOpen] = useState(isAdminSectionActive);
  const [isFinanceOpen, setIsFinanceOpen] = useState(isFinanceSectionActive);
  const [isPedagogicoOpen, setIsPedagogicoOpen] = useState(isPedagogicoSectionActive);

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

  const handleLinkClick = () => {
    onNavigate?.();
  };

  return (
    <div className="h-full w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 pb-3">
        <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">Diário de Classe</h1>
          <p className="text-xs text-muted-foreground">Sistema Educacional</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1 pb-2">
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
              {item.path === "/backlog" && unreadCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin Collapsible */}
        <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
              isAdminSectionActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                Administrativo
              </div>
              {isAdminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
            {adminSubMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (item.requiresAuth) {
                return (
                  <button
                    key={item.path}
                    onClick={(e) => { handleAdminItemClick(item, e); handleLinkClick(); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium w-full text-left",
                      isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.path === "/backlog" && unreadCount > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Finance */}
            <Collapsible open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
              <CollapsibleTrigger asChild>
                <button className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-sm font-medium",
                  isFinanceSectionActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-3.5 h-3.5" />
                    Financeiro
                  </div>
                  {isFinanceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
                {financeSubMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={handleLinkClick} className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all text-xs font-medium",
                      isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* Pedagógico */}
            <Collapsible open={isPedagogicoOpen} onOpenChange={setIsPedagogicoOpen}>
              <CollapsibleTrigger asChild>
                <button className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-sm font-medium",
                  isPedagogicoSectionActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Pedagógico
                  </div>
                  {isPedagogicoOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
                {pedagogicoSubMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={handleLinkClick} className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all text-xs font-medium",
                      isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <AdminPasswordDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} />

      {/* Footer */}
      <div className="p-4 pt-2 space-y-2 border-t border-border mt-auto">
        <div className="bg-accent/30 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-accent-foreground">
                {user?.email?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email || 'Professor'}</p>
              <p className="text-[10px] text-muted-foreground">Sistema Ativo</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive text-xs" onClick={handleSignOut}>
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};
