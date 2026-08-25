import type { AuthProvider, AuthSession, AuthUser, UserRole } from "./types";
import { TEST_USER, TEST_ADMIN, instructors as mockInstructors } from "@/data/mockData";

const MOCK_KEY = "rasta_auth_user";

interface StoredMockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const MOCK_CREDS: Record<string, { password: string; id: string; name: string; role: UserRole }> = {
  [TEST_USER.email]: {
    password: TEST_USER.password,
    id: "u1",
    name: TEST_USER.name,
    role: "user",
  },
  [TEST_ADMIN.email]: {
    password: TEST_ADMIN.password,
    id: "u-admin",
    name: TEST_ADMIN.name,
    role: "admin",
  },
};

function save(user: AuthUser) {
  try {
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
}

function load(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(MOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMockUser;
    // Revalida contra credenciais mock conhecidas para evitar sessionStorage injetável.
    const key = parsed.email.toLowerCase().trim();
    const mock = MOCK_CREDS[key];
    if (mock && mock.id === parsed.id && mock.name === parsed.name && mock.role === parsed.role) {
      return parsed;
    }
    // Tenta revalidar como instrutor.
    const inst = mockInstructors.find(
      (i) =>
        i.id === parsed.id &&
        i.loginEmail?.toLowerCase().trim() === key &&
        i.name === parsed.name
    );
    if (inst) {
      return { id: inst.id, email: inst.loginEmail!, name: inst.name, role: "instructor" };
    }
  } catch { /* ignore */ }
  return null;
}

function clear() {
  try {
    sessionStorage.removeItem(MOCK_KEY);
  } catch { /* ignore */ }
}

export const mockAuthProvider: AuthProvider = {
  name: "mock",

  async getSession() {
    const user = load();
    return { user, session: null };
  },

  async signInWithEmailPassword(email: string, password: string) {
    const key = email.toLowerCase().trim();

    const mock = MOCK_CREDS[key];
    if (mock && mock.password === password) {
      const user: AuthUser = { id: mock.id, email: key, name: mock.name, role: mock.role };
      save(user);
      return { user, session: null };
    }

    const inst = mockInstructors.find(
      (i) => i.loginEmail?.toLowerCase().trim() === key && i.loginPassword === password
    );
    if (inst) {
      const user: AuthUser = {
        id: inst.id,
        email: inst.loginEmail!,
        name: inst.name,
        role: "instructor",
      };
      save(user);
      return { user, session: null };
    }

    return { user: null, session: null };
  },

  async signInWithGoogle() {
    // Modo demo não suporta Google.
    return { user: null, session: null };
  },

  async signInWithApple() {
    // Modo demo não suporta Apple.
    return { user: null, session: null };
  },

  async signOut() {
    clear();
  },

  onAuthStateChange(callback) {
    // Mock não emite eventos de auth durante a sessão.
    return () => {};
  },
};
