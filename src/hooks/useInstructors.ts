import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { instructors as mockInstructors } from "@/data/mockData";

export function useInstructors() {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
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
      return mockInstructors;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useInstructor(id: string) {
  const query = useInstructors();
  return {
    ...query,
    data: query.data?.find((i) => i.id === id),
  };
}
