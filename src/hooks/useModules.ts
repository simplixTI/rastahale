import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { videoCategories } from "@/data/mockData";

export type Modality = "jiu-jitsu" | "luta-livre";
export interface Module {
  id: string;
  name: string;
  category: Modality;
}

// Modo demo = Supabase não configurado (mesma regra dos outros hooks).
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

// Tabela `modules` não está no tipo gerado do banco — acessa via cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modulesTable = () => (supabase as any).from("modules");

// Lista padrão = mesmas categorias do seed da migração 008, nas duas
// modalidades. Usada como fallback quando a tabela `modules` ainda não existe
// (migração 008 não aplicada) ou no modo demo, para a UI não ficar vazia.
const DEFAULT_MODULES: Module[] = videoCategories.flatMap((name) => [
  { id: `mod-jj-${name}`, name, category: "jiu-jitsu" as Modality },
  { id: `mod-ll-${name}`, name, category: "luta-livre" as Modality },
]);

// Estado mutável em memória para o modo demo (mock).
let mockModules: Module[] = [...DEFAULT_MODULES];

export function useModules() {
  return useQuery({
    queryKey: ["modules"],
    queryFn: async (): Promise<Module[]> => {
      if (!isMockMode()) {
        const { data, error } = await modulesTable().select("*").order("name");
        // Erro (ex: tabela ainda não existe) → cai nos padrões em vez de quebrar.
        if (!error && data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data as any[]).map((m) => ({ id: m.id, name: m.name, category: m.category as Modality }));
        }
        return DEFAULT_MODULES;
      }
      return [...mockModules];
    },
    staleTime: 0,
  });
}

/** Nomes de módulos (únicos), opcionalmente filtrados por modalidade. */
export function moduleNames(modules: Module[], category?: Modality): string[] {
  const filtered = category ? modules.filter((m) => m.category === category) : modules;
  return Array.from(new Set(filtered.map((m) => m.name)));
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, category }: { name: string; category: Modality }) => {
      const id = `mod-${Date.now()}`;
      if (!isMockMode()) {
        const { error } = await modulesTable().insert({ id, name, category });
        if (error) throw error;
        return { id };
      }
      mockModules.push({ id, name, category });
      return { id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!isMockMode()) {
        const { error } = await modulesTable().update({ name }).eq("id", id);
        if (error) throw error;
        return;
      }
      const m = mockModules.find((x) => x.id === id);
      if (m) m.name = name;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isMockMode()) {
        const { error } = await modulesTable().delete().eq("id", id);
        if (error) throw error;
        return;
      }
      mockModules = mockModules.filter((x) => x.id !== id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}
