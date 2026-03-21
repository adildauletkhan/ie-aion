import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/hooks/useLanguage";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AppLayout } from "./components/AppLayout";
import { AuthGuard } from "./components/AuthGuard";
import Geology from "./pages/Geology";
import Scenarios from "./pages/Scenarios";
import DataPage from "./pages/DataPage";
import DigitalTwin from "./pages/DigitalTwin";
import Models from "./pages/Models";
import BackAllocation from "./pages/BackAllocation";
import MasterDataPage from "./pages/MasterDataPage";
import AnnualPlanning from "./pages/AnnualPlanning";
import PlanningPage from "./pages/PlanningPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Integrations from "./pages/Integrations";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import CrisisResponse from "./pages/CrisisResponse";
import AdminPage from "./pages/AdminPage";
import WellLogsAnalysis from "./pages/WellLogsAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <LanguageProvider>
          <WorkspaceProvider>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={
            <AuthGuard>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/geology" element={<Geology />} />
                  <Route path="/scenarios" element={<Scenarios />} />
                  <Route path="/data" element={<DataPage />} />
                  <Route path="/planning" element={<PlanningPage />} />
                  <Route path="/annual-planning" element={<Navigate to="/planning" replace />} />
                  <Route path="/crisis-response" element={<CrisisResponse />} />
                  <Route path="/master-data" element={<MasterDataPage />} />
                  <Route path="/digital-twin" element={<DigitalTwin />} />
                  <Route path="/models" element={<Models />} />
            <Route path="/back-allocation" element={<BackAllocation />} />
                  <Route path="/well-logs" element={<WellLogsAnalysis />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </AuthGuard>
          } />
        </Routes>
          </WorkspaceProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
