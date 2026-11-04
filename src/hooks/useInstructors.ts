import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { instructors as mockInstructors } from "@/data/mockData";

// Modo demo = Supabase não configurado (ver nota em useAdminData).
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

export function useInstructors() {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      if (!isMockMode()) {
        const { data, error } = await supabase.from("instructors").select("*");
        if (error) throw error;
        return (data ?? []).map((i) => ({
          id:     i.id,
          name:   i.name,
          avatar: i.avatar_url ?? "",
          bio:    i.bio ?? "",
        }));
      }
      return mockInstructors.map((i) => ({ ...i }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useInstructor(id: string) {
  const { data, isLoading, isError, error, isFetching } = useInstructors();
  const instructor = useMemo(() => data?.find((i) => i.id === id), [data, id]);
  return { data: instructor, isLoading, isError, error, isFetching };
}
