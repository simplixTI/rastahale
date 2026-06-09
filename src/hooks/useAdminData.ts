import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  videos as mockVideos,
  mockUsers,
  mockPayments,
  mockPlans,
  instructors as mockInstructors,
  type Video,
  type Instructor,
} from "@/data/mockData";

// ── Helpers ────────────────────────────────────────────────────────────────

function isSupabaseUser(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

/** Retorna true quando o usuário logado é mock (não Supabase real). */
function isMockMode(): boolean {
  try {
    const saved = sessionStorage.getItem("rasta_auth_user");
    if (!saved) return true;
    const { id } = JSON.parse(saved) as { id: string };
    return !isSupabaseUser(id);
  } catch { return true; }
}

const toProfile = (u: typeof mockUsers[number]) => ({
  id:             u.id,
  name:           u.name,
  email:          u.email,
  avatar_url:     u.avatar,
  plan_name:      u.plan,
  status:         u.status,
  role:           "user" as const,
  join_date:      u.joinDate,
  last_access:    u.lastAccess,
  videos_watched: u.videosWatched,
  total_hours:    u.totalHours,
});

const toPayment = (p: typeof mockPayments[number]) => ({
  id:        p.id,
  user_id:   p.userId,
  user_name: p.userName,
  amount:    p.amount,
  method:    p.method,
  status:    p.status,
  date:      p.date,
  plan_name: p.plan,
});

const toPlan = (p: typeof mockPlans[number]) => ({
  id:          p.id,
  name:        p.name,
  price:       p.price,
  interval:    p.interval,
  features:    p.features,
  active:      p.active,
  categories:  p.categories,
  max_level:   p.maxLevel,
  users_count: p.usersCount,
});

// ── Admin: usuários ────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("join_date", { ascending: false });
          if (!error && data && data.length > 0) {
            return data.map((u) => ({
              id:             u.id,
              name:           u.name,
              email:          u.email,
              avatar_url:     u.avatar_url ?? "",
              plan_name:      u.plan_name ?? "Básico",
              status:         u.status as "ativo" | "inativo" | "pendente",
              role:           u.role as "user" | "admin",
              join_date:      u.join_date,
              last_access:    u.last_access,
              videos_watched: u.videos_watched ?? 0,
              total_hours:    Number(u.total_hours ?? 0),
            }));
          }
        } catch { /* fallback */ }
      }
      return mockUsers.map(toProfile);
    },
    staleTime: 0,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "ativo" | "inativo" | "pendente" }) => {
      if (isSupabaseUser(userId)) {
        await supabase.from("profiles").update({ status }).eq("id", userId);
      } else {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) user.status = status;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, name, email, avatarUrl }: {
      userId: string; name: string; email: string; avatarUrl: string;
    }) => {
      if (isSupabaseUser(userId)) {
        await supabase.from("profiles").update({ name, email, avatar_url: avatarUrl || undefined }).eq("id", userId);
      } else {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) { user.name = name; user.email = email; if (avatarUrl) user.avatar = avatarUrl; }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useUpdateUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      if (isSupabaseUser(userId)) {
        await supabase.from("profiles").update({ plan_name: plan }).eq("id", userId);
      } else {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) user.plan = plan;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

// ── Admin: pagamentos ──────────────────────────────────────────────────────

export function useAdminPayments() {
  return useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const { data, error } = await supabase
            .from("payments")
            .select("*")
            .order("date", { ascending: false });
          if (!error && data && data.length > 0) {
            return data.map((p) => ({
              id:        p.id,
              user_id:   p.user_id,
              user_name: p.user_name,
              amount:    Number(p.amount),
              method:    p.method as "PIX" | "Cartão" | "Boleto",
              status:    p.status as "pago" | "pendente" | "falhou",
              date:      p.date,
              plan_name: p.plan_name,
            }));
          }
        } catch { /* fallback */ }
      }
      return mockPayments.map(toPayment);
    },
    staleTime: 0,
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: "pago" | "pendente" | "falhou" }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("payments").update({ status }).eq("id", paymentId);
        if (!error) return;
      }
      const payment = mockPayments.find((p) => p.id === paymentId);
      if (payment) payment.status = status;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

// ── Admin: vídeos ──────────────────────────────────────────────────────────

export function useAdminVideos() {
  return useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const { data, error } = await supabase.from("videos").select("*");
          if (!error && data && data.length > 0) {
            return data.map((v) => ({
              id:               v.id,
              title:            v.title,
              description:      v.description ?? "",
              thumbnail:        v.thumbnail ?? "",
              videoUrl:         v.video_url ?? null,
              duration:         v.duration,
              category:         v.category as "jiu-jitsu" | "luta-livre",
              subcategory:      v.subcategory,
              level:            v.level as "Iniciante" | "Intermediário" | "Avançado",
              instructorId:     v.instructor_id,
              visible:          v.visible,
              unlockByProgress: v.unlock_by_progress,
              requiredProgress: v.required_progress,
            }));
          }
        } catch { /* fallback */ }
      }
      return mockVideos.map((v) => ({ ...v, videoUrl: v.videoUrl ?? null }));
    },
    staleTime: 0,
  });
}

export function useToggleVideoVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, visible }: { videoId: string; visible: boolean }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("videos").update({ visible }).eq("id", videoId);
        if (!error) return;
      }
      const video = mockVideos.find((v) => v.id === videoId);
      if (video) video.visible = visible;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useToggleVideoLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, unlockByProgress, requiredProgress }: {
      videoId: string; unlockByProgress: boolean; requiredProgress: number;
    }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("videos").update({
          unlock_by_progress: unlockByProgress,
          required_progress:  requiredProgress,
        }).eq("id", videoId);
        if (!error) return;
      }
      const video = mockVideos.find((v) => v.id === videoId);
      if (video) { video.unlockByProgress = unlockByProgress; video.requiredProgress = requiredProgress; }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useUpdateVideoThumbnail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, thumbnail }: { videoId: string; thumbnail: string }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("videos").update({ thumbnail }).eq("id", videoId);
        if (!error) return;
      }
      const video = mockVideos.find((v) => v.id === videoId);
      if (video) video.thumbnail = thumbnail;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Video, "id"> & { videoUrl?: string | null }) => {
      const id = `v${Date.now()}`;
      if (!isMockMode()) {
        const row = {
          id,
          title:              data.title,
          description:        data.description,
          thumbnail:          data.thumbnail,
          video_url:          data.videoUrl ?? null,
          duration:           data.duration,
          category:           data.category,
          subcategory:        data.subcategory,
          level:              data.level,
          instructor_id:      data.instructorId,
          visible:            data.visible ?? true,
          unlock_by_progress: data.unlockByProgress ?? false,
          required_progress:  data.requiredProgress ?? 0,
        };
        const { error } = await supabase.from("videos").insert(row);
        if (!error) return { id };
      }
      mockVideos.push({ ...data, id });
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, videoUrl, ...data }: Partial<Video> & { id: string; videoUrl?: string | null }) => {
      const updates: Record<string, unknown> = {};
      if (data.title       !== undefined) updates.title               = data.title;
      if (data.description !== undefined) updates.description         = data.description;
      if (data.thumbnail   !== undefined) updates.thumbnail           = data.thumbnail;
      if (videoUrl         !== undefined) updates.video_url           = videoUrl;
      if (data.duration    !== undefined) updates.duration            = data.duration;
      if (data.category    !== undefined) updates.category            = data.category;
      if (data.subcategory !== undefined) updates.subcategory         = data.subcategory;
      if (data.level       !== undefined) updates.level               = data.level;
      if (data.instructorId !== undefined) updates.instructor_id      = data.instructorId;
      if (data.visible     !== undefined) updates.visible             = data.visible;
      if (data.unlockByProgress !== undefined) updates.unlock_by_progress = data.unlockByProgress;
      if (data.requiredProgress !== undefined) updates.required_progress  = data.requiredProgress;

      if (!isMockMode()) {
        const { error } = await supabase.from("videos").update(updates).eq("id", id);
        if (!error) return;
      }
      const idx = mockVideos.findIndex((v) => v.id === id);
      if (idx !== -1) {
        Object.assign(mockVideos[idx], data);
        if (videoUrl !== undefined) (mockVideos[idx] as Record<string, unknown>).videoUrl = videoUrl;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

// ── Admin: planos ──────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const { data, error } = await supabase.from("plans").select("*");
          if (!error && data && data.length > 0) {
            return data.map((p) => ({
              id:          p.id,
              name:        p.name,
              price:       Number(p.price),
              interval:    p.interval as "mensal" | "trimestral" | "anual",
              features:    p.features ?? [],
              active:      p.active,
              categories:  p.categories ?? [],
              max_level:   p.max_level as "Iniciante" | "Intermediário" | "Avançado",
              users_count: 0,
            }));
          }
        } catch { /* fallback */ }
      }
      return mockPlans.map(toPlan);
    },
    staleTime: 0,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string; price: number; interval: "mensal" | "trimestral" | "anual";
      max_level: "Iniciante" | "Intermediário" | "Avançado";
      categories: string[]; features: string[]; active: boolean;
    }) => {
      const id = `plan-${Date.now()}`;
      if (!isMockMode()) {
        const { error } = await supabase.from("plans").insert({
          id,
          name:       data.name,
          price:      data.price,
          interval:   data.interval,
          max_level:  data.max_level,
          categories: data.categories,
          features:   data.features,
          active:     data.active,
        });
        if (!error) return;
      }
      mockPlans.push({
        id, name: data.name, price: data.price, interval: data.interval,
        maxLevel: data.max_level, categories: data.categories,
        features: data.features, active: data.active, usersCount: 0,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string; name: string; price: number; interval: "mensal" | "trimestral" | "anual";
      max_level: "Iniciante" | "Intermediário" | "Avançado";
      categories: string[]; features: string[]; active: boolean;
    }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("plans").update({
          name:       data.name,
          price:      data.price,
          interval:   data.interval,
          max_level:  data.max_level,
          categories: data.categories,
          features:   data.features,
          active:     data.active,
        }).eq("id", data.id);
        if (!error) return;
      }
      const plan = mockPlans.find((p) => p.id === data.id);
      if (plan) {
        plan.name = data.name; plan.price = data.price; plan.interval = data.interval;
        plan.maxLevel = data.max_level; plan.categories = data.categories;
        plan.features = data.features; plan.active = data.active;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
  });
}

export function useTogglePlanActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, active }: { planId: string; active: boolean }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("plans").update({ active }).eq("id", planId);
        if (!error) return;
      }
      const plan = mockPlans.find((p) => p.id === planId);
      if (plan) plan.active = active;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
  });
}

// ── Admin: dashboard KPIs ──────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const [{ data: profiles }, { data: videos }, { data: payments }] = await Promise.all([
            supabase.from("profiles").select("id, status"),
            supabase.from("videos").select("id"),
            supabase.from("payments").select("amount, status"),
          ]);
          if (profiles && videos && payments) {
            return {
              totalUsers:      profiles.length,
              activeUsers:     profiles.filter((u) => u.status === "ativo").length,
              totalVideos:     videos.length,
              pendingPayments: payments.filter((p) => p.status === "pendente").length,
              revenue:         payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0),
            };
          }
        } catch { /* fallback */ }
      }
      return {
        totalUsers:      mockUsers.length,
        activeUsers:     mockUsers.filter((u) => u.status === "ativo").length,
        totalVideos:     mockVideos.length,
        pendingPayments: mockPayments.filter((p) => p.status === "pendente").length,
        revenue:         mockPayments.filter((p) => p.status === "pago").reduce((s, p) => s + p.amount, 0),
      };
    },
    staleTime: 0,
  });
}

// ── Admin: instrutores ─────────────────────────────────────────────────────

export function useAdminInstructors() {
  return useQuery({
    queryKey: ["admin-instructors"],
    queryFn: async () => {
      if (!isMockMode()) {
        try {
          const { data, error } = await supabase.from("instructors").select("*");
          if (!error && data && data.length > 0) {
            return data.map((i) => ({
              id:     i.id,
              name:   i.name,
              avatar: i.avatar_url ?? "",
              bio:    i.bio ?? "",
            }));
          }
        } catch { /* fallback */ }
      }
      return mockInstructors.map((i) => ({ ...i }));
    },
    staleTime: 0,
  });
}

export function useCreateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, bio, avatar, loginEmail, loginPassword }: {
      name: string; bio: string; avatar: string; loginEmail?: string; loginPassword?: string;
    }) => {
      const id = `inst-${Date.now()}`;
      if (!isMockMode()) {
        const { error } = await supabase.from("instructors").insert({
          id, name, bio, avatar_url: avatar || null,
          login_email: loginEmail || null, login_password: loginPassword || null,
        });
        if (!error) return { id };
      }
      mockInstructors.push({ id, name, bio, avatar, loginEmail, loginPassword });
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      qc.invalidateQueries({ queryKey: ["instructors"] });
    },
  });
}

export function useUpdateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, bio, avatar, loginEmail, loginPassword }: {
      id: string; name: string; bio: string; avatar: string; loginEmail?: string; loginPassword?: string;
    }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("instructors").update({
          name, bio, avatar_url: avatar || null,
          login_email: loginEmail || null, login_password: loginPassword || null,
        }).eq("id", id);
        if (!error) return;
      }
      const inst = mockInstructors.find((i) => i.id === id);
      if (inst) {
        inst.name = name; inst.bio = bio; inst.avatar = avatar;
        inst.loginEmail = loginEmail || undefined;
        inst.loginPassword = loginPassword || undefined;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      qc.invalidateQueries({ queryKey: ["instructors"] });
    },
  });
}

export function useUpdateInstructorAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, avatar }: { id: string; avatar: string }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("instructors").update({ avatar_url: avatar }).eq("id", id);
        if (!error) return;
      }
      const inst = mockInstructors.find((i) => i.id === id);
      if (inst) inst.avatar = avatar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      qc.invalidateQueries({ queryKey: ["instructors"] });
    },
  });
}

export function useDeleteInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isMockMode()) {
        const { error } = await supabase.from("instructors").delete().eq("id", id);
        if (!error) return;
      }
      const idx = mockInstructors.findIndex((i) => i.id === id);
      if (idx !== -1) mockInstructors.splice(idx, 1);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      qc.invalidateQueries({ queryKey: ["instructors"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
    },
  });
}
