import type { Session as SupabaseSession } from "@supabase/supabase-js";
import type { User as FirebaseUser } from "firebase/auth";

export type UserRole = "user" | "admin" | "instructor";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export type AuthSession =
  | { provider: "supabase"; session: SupabaseSession }
  | { provider: "firebase"; user: FirebaseUser }
  | null;

export interface AuthProvider {
  readonly name: "supabase" | "firebase" | "mock";

  /** Restaura a sessão atual (chamado no mount do app). */
  getSession(): Promise<{ user: AuthUser | null; session: AuthSession }>;

  /** Autentica com email e senha. */
  signInWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ user: AuthUser | null; session: AuthSession }>;

  /** Autentica com Google (Firebase) ou outro OAuth. */
  signInWithGoogle(): Promise<{ user: AuthUser | null; session: AuthSession }>;

  /** Autentica com Apple (obrigatório na App Store junto ao Google). */
  signInWithApple(): Promise<{ user: AuthUser | null; session: AuthSession }>;

  /** Encerra a sessão no provider. */
  signOut(): Promise<void>;

  /** Listener de mudanças de estado de auth. Retorna função de unsubscribe. */
  onAuthStateChange(
    callback: (payload: { user: AuthUser | null; session: AuthSession; event?: string }) => void
  ): () => void;
}

export type AuthErrorType =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "too_many_requests"
  | "network_error"
  | "popup_closed"
  | "provider_error"
  | "unknown";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly type: AuthErrorType
  ) {
    super(message);
    this.name = "AuthError";
  }
}
