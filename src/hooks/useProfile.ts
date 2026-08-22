import { DEFAULT_AVATAR } from "@/lib/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mockUsers, mockPayments, mockPlans, videos as mockVideos, instructors as mockInstructors } from "@/data/mockData";
import type { UserRole } from "@/lib/auth";

export interface UserPayment {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  method: string;
  status: "pago" | "pendente" | "falhou";
  date: string;
  plan_name: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  planName: string;
  status: "ativo" | "inativo" | "pendente";
  role: UserRole;
  joinDate: string;
  lastAccess: string;
  videosWatched: number;
  totalHours: number;
}

const PROGRESS_KEY = "rasta_progress";

type ProgressStore = Record<string, { progress: number; watched: boolean }>;

function isSupabaseUser(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

function loadProgressStore(): ProgressStore {
  try { return JSON.parse(sessionStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}

const ADMIN_PROFILE: Profile = {
  id:            "u-admin",
  email:         "admin@rastahale.com",
  name:          "Admin RastaHale",
  avatarUrl:     DEFAULT_AVATAR,
  planName:      "Admin",
  status:        "ativo",
  role:          "admin",
  joinDate:      "2023-01-01",
  lastAccess:    new Date().toISOString().split("T")[0],
  videosWatched: 0,
  totalHours:    0,
};

function buildMockProfile(userId: string): Profile {
  if (userId === "u-admin") return ADMIN_PROFILE;

  // Instrutores em modo mock têm id começando com "inst-".
  const instructor = mockInstructors.find((i) => i.id === userId);
  if (instructor) {
    return {
      id:            instructor.id,
      email:         instructor.loginEmail ?? "",
      name:          instructor.name,
      avatarUrl:     instructor.avatar,
      planName:      "Instructor",
      status:        "ativo",
      role:          "instructor",
      joinDate:      "2024-01-01",
      lastAccess:    new Date().toISOString().split("T")[0],
      videosWatched: 0,
      totalHours:    0,
    };
  }

  const mockUser  = mockUsers.find((u) => u.id === userId) ?? mockUsers[0];
  const store     = loadProgressStore();
  const watched   = mockVideos.filter((v) => store[v.id]?.watched ?? v.watched ?? false).length;
  const totalHours = mockVideos
    .filter((v) => store[v.id]?.watched ?? v.watched ?? false)
    .reduce((sum, v) => {
      const [min = 0, sec = 0] = v.duration.split(":").map(Number);
      return sum + (min * 60 + sec) / 3600;
    }, 0);
  return {
    id:            mockUser.id,
    email:         mockUser.email,
    name:          mockUser.name,
    avatarUrl:     mockUser.avatar,
    planName:      mockUser.plan,
    status:        mockUser.status,
    role:          "user",
    joinDate:      mockUser.joinDate,
    lastAccess:    mockUser.lastAccess,
    videosWatched: Number.isFinite(watched) ? watched : mockUser.videosWatched,
    totalHours:    Number.isFinite(Number(totalHours.toFixed(1))) ? Number(totalHours.toFixed(1)) : mockUser.totalHours,
  };
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey:  ["profile", userId],
    queryFn:   async () => {
      if (isSupabaseUser(userId)) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (!error && data) {
            return {
              id:            data.id,
              email:         data.email,
              name:          data.name,
              avatarUrl:     data.avatar_url ?? "",
              planName:      data.plan_name ?? "Básico",
              status:        data.status as Profile["status"],
              role:          data.role as Profile["role"],
              joinDate:      data.join_date,
              lastAccess:    data.last_access,
              videosWatched: data.videos_watched ?? 0,
              totalHours:    Number(data.total_hours ?? 0),
            } as Profile;
          }
        } catch { /* fallback */ }
      }
      return buildMockProfile(userId);
    },
    enabled:   !!userId,

  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, name, avatarUrl }: { userId: string; name?: string; avatarUrl?: string }) => {
      if (isSupabaseUser(userId)) {
        const updates: Record<string, string> = {};
        if (name)      updates.name       = name;
        if (avatarUrl) updates.avatar_url = avatarUrl;
        await supabase.from("profiles").update(updates).eq("id", userId);
      } else {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) {
          if (name)      user.name   = name;
          if (avatarUrl) user.avatar = avatarUrl;
        }
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["profile", vars.userId] });
    },
  });
}

export function useUserPayments(userId: string) {
  return useQuery({
    queryKey: ["user-payments", userId],
    queryFn:  async () => {
      if (isSupabaseUser(userId)) {
        try {
          const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: false });
          if (!error && data) {
            return data.map((p) => ({
              id:        p.id,
              user_id:   p.user_id,
              user_name: p.user_name,
              amount:    Number(p.amount),
              method:    p.method,
              status:    p.status as UserPayment["status"],
              date:      p.date,
              plan_name: p.plan_name,
            })) as UserPayment[];
          }
        } catch { /* fallback */ }
      }
      return mockPayments
        .filter((p) => p.userId === userId)
        .map((p): UserPayment => ({
          id: p.id, user_id: p.userId, user_name: p.userName,
          amount: p.amount, method: p.method,
          status: p.status as UserPayment["status"],
          date: p.date, plan_name: p.plan,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled:   !!userId,

  });
}

export function useUpdatePlanName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, planName }: { userId: string; planName: string }) => {
      if (isSupabaseUser(userId)) {
        await supabase.from("profiles").update({ plan_name: planName }).eq("id", userId);
      } else {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) user.plan = planName;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["profile", vars.userId] });
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn:  async () => {
      try {
        const { data, error } = await supabase.from("plans").select("*").eq("active", true);
        if (!error && data && data.length > 0) {
          return data.map((p) => ({
            id:         p.id,
            name:       p.name,
            price:      Number(p.price),
            interval:   p.interval as "mensal" | "trimestral" | "anual",
            features:   p.features ?? [],
            active:     p.active,
            categories: p.categories ?? [],
            max_level:  p.max_level as "Iniciante" | "Intermediário" | "Avançado",
          }));
        }
      } catch { /* fallback */ }
      return mockPlans.map((p) => ({
        id: p.id, name: p.name, price: p.price,
        interval: p.interval, features: p.features,
        active: p.active, categories: p.categories, max_level: p.maxLevel,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}
