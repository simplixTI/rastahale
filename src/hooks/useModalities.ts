import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface Modality {
  id: string;    // valor guardado em videos.category (ex: "jiu-jitsu", "MMA")
  label: string; // exibição (ex: "Jiu Jitsu")
}

function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

// Tabela `modalities` não está no tipo gerado do banco — acessa via cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modalitiesTable = () => (supabase as any).from("modalities");

// Fallback usado quando a tabela ainda não existe (migração 009 não aplicada)
// ou em modo demo. Iguais às modalidades originais.
const DEFAULT_MODALITIES: Modality[] = [
  { id: "jiu-jitsu",  label: "Jiu Jitsu" },
  { id: "luta-livre", label: "Luta Livre" },
];

let mockModalities: Modality[] = [...DEFAULT_MODALITIES];

export function useModalities() {
  return useQuery({
    queryKey: ["modalities"],
    queryFn: async (): Promise<Modality[]> => {
      if (!isMockMode()) {
        const { data, error } = await modalitiesTable().select("*").order("created_at");
        if (!error && data && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data as any[]).map((m) => ({ id: m.id, label: m.label }));
        }
        return DEFAULT_MODALITIES;
      }
      return [...mockModalities];
    },

  });
}

export function useCreateModality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      // id = o próprio texto digitado (assim getCategoryLabel exibe igual sem
      // precisar consultar a tabela em todo lugar). Para as duas originais o id
      // já é o slug histórico ("jiu-jitsu"/"luta-livre").
      const id = label.trim();
      if (!isMockMode()) {
        const { error } = await modalitiesTable().insert({ id, label: id });
        if (error) throw error;
        return { id };
      }
      mockModalities.push({ id, label: id });
      return { id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modalities"] }),
  });
}

export function useUpdateModality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      if (!isMockMode()) {
        const { error } = await modalitiesTable().update({ label }).eq("id", id);
        if (error) throw error;
        return;
      }
      const m = mockModalities.find((x) => x.id === id);
      if (m) m.label = label;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modalities"] }),
  });
}

export function useDeleteModality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isMockMode()) {
        const { error } = await modalitiesTable().delete().eq("id", id);
        if (error) throw error;
        return;
      }
      mockModalities = mockModalities.filter((x) => x.id !== id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalities"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
  });
}
