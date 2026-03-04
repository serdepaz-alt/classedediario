import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
            <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
            <Route path="/programmatic-content" element={<ProtectedRoute><ProgrammaticContentPage /></ProtectedRoute>} />
            <Route path="/turmas" element={<ProtectedRoute><TurmasPage /></ProtectedRoute>} />
            <Route path="/predictive" element={<ProtectedRoute><PredictivePage /></ProtectedRoute>} />
            <Route path="/smart-finance" element={<ProtectedRoute><SmartFinancePage /></ProtectedRoute>} />
            <Route path="/professores" element={<ProtectedRoute><ProfessoresPage /></ProtectedRoute>} />
            <Route path="/cronograma" element={<ProtectedRoute><CronogramaPage /></ProtectedRoute>} />
            <Route path="/aceite-cronograma" element={<ProtectedRoute><AceiteCronogramaPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
