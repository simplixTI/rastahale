import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, registerSessionExpiredCallback } from "@/contexts/AuthContext";
import { ProfileOverrideProvider } from "@/contexts/ProfileContext";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Favorites from "./pages/Favorites";
import ProgressPage from "./pages/ProgressPage";
import Profile from "./pages/Profile";
import VideoDetail from "./pages/VideoDetail";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminModules from "./pages/admin/AdminModules";
import AdminSeason from "./pages/admin/AdminSeason";
import AdminStore from "./pages/admin/AdminStore";
import InstructorSection from "./pages/InstructorSection";
import Instructors from "./pages/Instructors";
import AthleteModules from "./pages/AthleteModules";
import AthleteModuleLessons from "./pages/AthleteModuleLessons";
import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioFeedback from "./pages/studio/StudioFeedback";
import StudioPerfil from "./pages/studio/StudioPerfil";
import StudioEditPerfil from "./pages/studio/StudioEditPerfil";
import StudioConfiguracoes from "./pages/studio/StudioConfiguracoes";
import StudioBottomBar from "./components/StudioBottomBar";
import NotFound from "./pages/NotFound";
import EditProfile from "./pages/EditProfile";
import MyPlan from "./pages/MyPlan";
import Settings from "./pages/Settings";
import BottomTabBar from "./components/BottomTabBar";
import { LoadingScreen } from "./components/LoadingScreen";
import Install from "./pages/Install";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Não retentar em erros de autenticação ou de rede (Supabase offline/pausado)
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        // Erros de rede não têm status — não retentar para evitar flood de requests
        if (!status) return false;
        return failureCount < 1;
      },
      staleTime: 1000 * 30,
    },
    mutations: {
      retry: false,
    },
  },
});

const ProtectedRoute = ({ children, adminOnly = false, instructorOnly = false }: {
  children: React.ReactNode; adminOnly?: boolean; instructorOnly?: boolean;
}) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly      && user.role !== "admin")      return <Navigate to="/" replace />;
  if (instructorOnly && user.role !== "instructor") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin    = location.pathname.startsWith("/admin");
  const isStudio   = location.pathname.startsWith("/studio");
  const isLogin    = location.pathname === "/login";
  const showTabBar = !isAdmin && !isLogin && !isStudio;

  // Botão voltar do Android navega no histórico em vez de fechar o app.
  useAndroidBackButton();

  // Redireciona ao login quando a sessão expira.
  // Usa ref para evitar stale closure sem re-registrar a cada render.
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => {
    registerSessionExpiredCallback(() => {
      queryClient.clear();
      navigateRef.current("/login", { replace: true });
    });
  }, []);

  if (loading) return <LoadingScreen />;
  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin" : user.role === "instructor" ? "/studio" : "/"} replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/buscar" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/favoritos" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/progresso" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/perfil/editar" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/perfil/plano" element={<ProtectedRoute><MyPlan /></ProtectedRoute>} />
        <Route path="/perfil/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/video/:id" element={<ProtectedRoute><VideoDetail /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/videos" element={<ProtectedRoute adminOnly><AdminVideos /></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/pagamentos" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/planos" element={<ProtectedRoute adminOnly><AdminPlans /></ProtectedRoute>} />
        <Route path="/admin/instrutores" element={<ProtectedRoute adminOnly><AdminInstructors /></ProtectedRoute>} />
        <Route path="/admin/modulos"     element={<ProtectedRoute adminOnly><AdminModules /></ProtectedRoute>} />
        <Route path="/admin/temporada"   element={<ProtectedRoute adminOnly><AdminSeason /></ProtectedRoute>} />
        <Route path="/admin/loja"        element={<ProtectedRoute adminOnly><AdminStore /></ProtectedRoute>} />
        <Route path="/professores" element={<ProtectedRoute><Instructors /></ProtectedRoute>} />
        <Route path="/instrutor/:id" element={<ProtectedRoute><InstructorSection /></ProtectedRoute>} />
        <Route path="/atleta/:id" element={<ProtectedRoute><AthleteModules /></ProtectedRoute>} />
        <Route path="/atleta/:id/modulo/:modulo" element={<ProtectedRoute><AthleteModuleLessons /></ProtectedRoute>} />
        <Route path="/studio"          element={<ProtectedRoute instructorOnly><StudioDashboard /></ProtectedRoute>} />
        <Route path="/studio/feedback" element={<ProtectedRoute instructorOnly><StudioFeedback /></ProtectedRoute>} />
        <Route path="/studio/perfil"              element={<ProtectedRoute instructorOnly><StudioPerfil        /></ProtectedRoute>} />
        <Route path="/studio/perfil/editar"      element={<ProtectedRoute instructorOnly><StudioEditPerfil   /></ProtectedRoute>} />
        <Route path="/studio/perfil/configuracoes" element={<ProtectedRoute instructorOnly><StudioConfiguracoes /></ProtectedRoute>} />
        <Route path="/instalar" element={<Install />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showTabBar  && <BottomTabBar />}
      {isStudio    && <StudioBottomBar />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProfileOverrideProvider>
            <AppRoutes />
          </ProfileOverrideProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
