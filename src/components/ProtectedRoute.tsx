import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  instructorOnly?: boolean;
}

/**
 * Porta de entrada das rotas logadas. É só a camada de tela: o que protege os
 * dados é a RLS do Supabase e a checagem de papel nas Edge Functions.
 */
export const ProtectedRoute = ({ children, adminOnly = false, instructorOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly      && user.role !== "admin")      return <Navigate to="/" replace />;
  if (instructorOnly && user.role !== "instructor") return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
