import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { instructors as mockInstructors } from "@/data/mockData";

function isMockMode(): boolean {
  try {
    const saved = sessionStorage.getItem("rasta_auth_user");
    if (!saved) return true;
    const { id } = JSON.parse(saved) as { id: string };
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  } catch { return true; }
}

export function useInstructors() {
  return useQuery({
    queryKey: ["instructors"],
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
        } catch { /* Supabase inacessível — usa mock */ }
      }
      return mockInstructors.map((i) => ({ ...i }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useInstructor(id: string) {
  const query = useInstructors();
  return {
    ...query,
    data: query.data?.find((i) => i.id === id),
  };
}
