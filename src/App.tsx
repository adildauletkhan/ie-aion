import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/hooks/useLanguage";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { CompanyProfileProvider } from "@/context/CompanyProfileContext";
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
import Onboarding from "./pages/Onboarding";
import Predictive from "./pages/Predictive";
import DailyBriefing from "./pages/DailyBriefing";
import GreenGrid from "./pages/GreenGrid";
import EnergyMap from "./pages/EnergyMap";
import CompanyStructure from "./pages/CompanyStructure";
import ProductionProgramKEGOC from "./pages/ProductionProgramKEGOC";
import MiningProduction from "./pages/MiningProduction";
import MiningSafety from "./pages/MiningSafety";
import MiningMap from "./pages/MiningMap";
import MiningGeology from "./pages/MiningGeology";
import MiningDigitalTwin from "./pages/MiningDigitalTwin";
import MiningCrisis from "./pages/MiningCrisis";
import OilPipelineMap from "./pages/OilPipelineMap";
import GasPipelineMap from "./pages/GasPipelineMap";
import OilPipelineMonitoring from "./pages/OilPipelineMonitoring";
import GasPipelineMonitoring from "./pages/GasPipelineMonitoring";
import { OnboardingGuard } from "./components/OnboardingGuard";

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
          <CompanyProfileProvider>
          <WorkspaceProvider>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          } />
          <Route path="*" element={
            <AuthGuard>
              <OnboardingGuard>
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
                    <Route path="/predictive" element={<Predictive />} />
                    <Route path="/briefing" element={<DailyBriefing />} />
                    <Route path="/green-grid" element={<GreenGrid />} />
                    <Route path="/energy-map" element={<EnergyMap />} />
                    <Route path="/company-structure" element={<CompanyStructure />} />
                    <Route path="/production-program" element={<ProductionProgramKEGOC />} />
                    <Route path="/mining-production" element={<MiningProduction />} />
                    <Route path="/mining-safety" element={<MiningSafety />} />
                    <Route path="/mining-map" element={<MiningMap />} />
                    <Route path="/mining-geology" element={<MiningGeology />} />
                    <Route path="/mining-digital-twin" element={<MiningDigitalTwin />} />
                    <Route path="/mining-crisis" element={<MiningCrisis />} />
                    <Route path="/oil-pipeline-map" element={<OilPipelineMap />} />
                    <Route path="/gas-pipeline-map" element={<GasPipelineMap />} />
                    <Route path="/oil-pipeline-monitoring" element={<OilPipelineMonitoring />} />
                    <Route path="/gas-pipeline-monitoring" element={<GasPipelineMonitoring />} />
                    <Route path="/oil-pipeline-dispatch" element={<OilPipelineMonitoring />} />
                    <Route path="/oil-pipeline-incidents" element={<OilPipelineMonitoring />} />
                    <Route path="/gas-pipeline-compressors" element={<GasPipelineMonitoring />} />
                    <Route path="/gas-pipeline-balance" element={<GasPipelineMonitoring />} />
                    <Route path="/gas-pipeline-incidents" element={<GasPipelineMonitoring />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </OnboardingGuard>
            </AuthGuard>
          } />
        </Routes>
          </WorkspaceProvider>
          </CompanyProfileProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
