import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminOnlyRoute } from "@/components/ProfessorRoute";
import Index from "./pages/Index";
import StudentsPage from "./pages/StudentsPage";
import AttendancePage from "./pages/AttendancePage";
import GradesPage from "./pages/GradesPage";
import NotesPage from "./pages/NotesPage";
import ProgrammaticContentPage from "./pages/ProgrammaticContentPage";
import TurmasPage from "./pages/TurmasPage";
import PredictivePage from "./pages/PredictivePage";
import SmartFinancePage from "./pages/SmartFinancePage";
import ProfessoresPage from "./pages/ProfessoresPage";
import CronogramaPage from "./pages/CronogramaPage";
import AceiteCronogramaPage from "./pages/AceiteCronogramaPage";
import GestaoExcecoesPage from "./pages/GestaoExcecoesPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import PayrollPage from "./pages/PayrollPage";
import BacklogPage from "./pages/BacklogPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<ProtectedRoute><AdminOnlyRoute><Index /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><AdminOnlyRoute><StudentsPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
              <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><AdminOnlyRoute><NotesPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/backlog" element={<ProtectedRoute><AdminOnlyRoute><BacklogPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/programmatic-content" element={<ProtectedRoute><AdminOnlyRoute><ProgrammaticContentPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/turmas" element={<ProtectedRoute><AdminOnlyRoute><TurmasPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/predictive" element={<ProtectedRoute><AdminOnlyRoute><PredictivePage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/smart-finance" element={<ProtectedRoute><AdminOnlyRoute><SmartFinancePage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/professores" element={<ProtectedRoute><AdminOnlyRoute><ProfessoresPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/cronograma" element={<ProtectedRoute><AdminOnlyRoute><CronogramaPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/aceite-cronograma" element={<ProtectedRoute><AdminOnlyRoute><AceiteCronogramaPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/gestao-excecoes" element={<ProtectedRoute><AdminOnlyRoute><GestaoExcecoesPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute><AdminOnlyRoute><PayrollPage /></AdminOnlyRoute></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminOnlyRoute><AdminPage /></AdminOnlyRoute></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
