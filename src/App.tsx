import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreatePost from "./pages/CreatePost";
import Onboarding from "./pages/Onboarding";
import Apps from "./pages/Apps";
import Content from "./pages/Content";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import WeeklyReports from "./pages/WeeklyReports";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import OAuthCallback from "./pages/OAuthCallback";
import Revenue from "./pages/Revenue";
import Funding from "./pages/Funding";
import Audience from "./pages/Audience";
import LandingPage from "./pages/LandingPage";
import AppLanding from "./pages/AppLanding";
import Intelligence from "./pages/Intelligence";
import MarketIntelligence from "./pages/MarketIntelligence";
import Prospects from "./pages/Prospects";
import Distribution from "./pages/Distribution";
import Orchestrator from "./pages/Orchestrator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/index" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
       <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
       <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
       <Route path="/apps" element={<ProtectedRoute><Apps /></ProtectedRoute>} />
       <Route path="/apps/:id/landing" element={<ProtectedRoute><AppLanding /></ProtectedRoute>} />
       <Route path="/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
       <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
       <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
       <Route path="/weekly-reports" element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>} />
       <Route path="/intelligence" element={<ProtectedRoute><Intelligence /></ProtectedRoute>} />
       <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
       <Route path="/audience" element={<ProtectedRoute><Audience /></ProtectedRoute>} />
       <Route path="/market-intelligence" element={<ProtectedRoute><MarketIntelligence /></ProtectedRoute>} />
       <Route path="/prospects" element={<ProtectedRoute><Prospects /></ProtectedRoute>} />
       <Route path="/distribution" element={<ProtectedRoute><Distribution /></ProtectedRoute>} />
       <Route path="/orchestrator" element={<ProtectedRoute><Orchestrator /></ProtectedRoute>} />
       <Route path="/funding" element={<ProtectedRoute><Funding /></ProtectedRoute>} />
       <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/lp/:slug" element={<LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
