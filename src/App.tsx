import { Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, registerSessionExpiredCallback } from "@/contexts/AuthContext";
import { ProfileOverrideProvider } from "@/contexts/ProfileContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import BottomTabBar from "./components/BottomTabBar";
import StudioBottomBar from "./components/StudioBottomBar";
import { LoadingScreen } from "./components/LoadingScreen";

// Primeira tela de quem entra (visitante → Login, aluno → Index): vão no pacote
// principal. O resto é carregado por rota — o celular do aluno não baixa o painel
// de admin, o Studio, os gráficos nem o Firebase de telas que ele nunca abre.
import Index from "./pages/Index";
import Login from "./pages/Login";

const Search               = lazyWithRetry(() => import("./pages/Search"));
const Favorites            = lazyWithRetry(() => import("./pages/Favorites"));
const ProgressPage         = lazyWithRetry(() => import("./pages/ProgressPage"));
const Profile              = lazyWithRetry(() => import("./pages/Profile"));
const VideoDetail          = lazyWithRetry(() => import("./pages/VideoDetail"));
const ForgotPassword       = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword        = lazyWithRetry(() => import("./pages/ResetPassword"));
const EditProfile          = lazyWithRetry(() => import("./pages/EditProfile"));
const MyPlan               = lazyWithRetry(() => import("./pages/MyPlan"));
const Settings             = lazyWithRetry(() => import("./pages/Settings"));
const InstructorSection    = lazyWithRetry(() => import("./pages/InstructorSection"));
const Instructors          = lazyWithRetry(() => import("./pages/Instructors"));
const AthleteModules       = lazyWithRetry(() => import("./pages/AthleteModules"));
const AthleteModuleLessons = lazyWithRetry(() => import("./pages/AthleteModuleLessons"));
const Install              = lazyWithRetry(() => import("./pages/Install"));
const PrivacyPolicy        = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const DeleteAccount        = lazyWithRetry(() => import("./pages/DeleteAccount"));
const TermsOfService       = lazyWithRetry(() => import("./pages/TermsOfService"));
const Support              = lazyWithRetry(() => import("./pages/Support"));
const NotFound             = lazyWithRetry(() => import("./pages/NotFound"));

const AdminDashboard   = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminVideos      = lazyWithRetry(() => import("./pages/admin/AdminVideos"));
const AdminUsers       = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminPayments    = lazyWithRetry(() => import("./pages/admin/AdminPayments"));
const AdminPlans       = lazyWithRetry(() => import("./pages/admin/AdminPlans"));
const AdminInstructors = lazyWithRetry(() => import("./pages/admin/AdminInstructors"));
const AdminModules     = lazyWithRetry(() => import("./pages/admin/AdminModules"));
const AdminSeason      = lazyWithRetry(() => import("./pages/admin/AdminSeason"));
const AdminStore       = lazyWithRetry(() => import("./pages/admin/AdminStore"));

const StudioDashboard     = lazyWithRetry(() => import("./pages/studio/StudioDashboard"));
const StudioFeedback      = lazyWithRetry(() => import("./pages/studio/StudioFeedback"));
const StudioPerfil        = lazyWithRetry(() => import("./pages/studio/StudioPerfil"));
const StudioEditPerfil    = lazyWithRetry(() => import("./pages/studio/StudioEditPerfil"));
const StudioConfiguracoes = lazyWithRetry(() => import("./pages/studio/StudioConfiguracoes"));

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

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin    = location.pathname.startsWith("/admin");
  const isStudio   = location.pathname.startsWith("/studio");
  const isLogin    = location.pathname === "/login"
                   || location.pathname === "/esqueci-senha"
                   || location.pathname === "/reset-senha";
  const showTabBar = !isAdmin && !isLogin && !isStudio;

  // Botão voltar do Android navega no histórico em vez de fechar o app.
  useAndroidBackButton();

  // Deep links: quando o Android abre o app via link do dominio
  // (ex: Stripe redirect apos pagamento), navega pra rota correspondente.
  useDeepLinks();

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
      {/* lg:pl-60 reserva a largura do menu lateral (BottomTabBar no desktop). */}
      <div className={showTabBar ? "lg:pl-60" : undefined}>
      <RouteErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin" : user.role === "instructor" ? "/studio" : "/"} replace /> : <Login />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/reset-senha" element={<ResetPassword />} />
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
            <Route path="/excluir-conta" element={<DeleteAccount />} />
            <Route path="/termos" element={<TermsOfService />} />
            <Route path="/suporte" element={<Support />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
      </div>
      {showTabBar  && <BottomTabBar />}
      {isStudio    && <StudioBottomBar />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
