import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { videoCategories, videos as mockVideos } from "@/data/mockData";

// Na tela, cada módulo é uma "Categoria" (Wrestling, Fundamentos…) — lista
// única, sem a camada de modalidade por cima. A modalidade continua só como
// dado interno (modules.category / videos.category, colunas obrigatórias):
// o vídeo herda a do módulo escolhido.
export type Modality = string;

/** Modalidade interna das categorias novas (o padrão histórico do app). */
export const DEFAULT_MODALITY: Modality = "jiu-jitsu";
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

  });
}

/** Nomes de módulos (únicos), opcionalmente filtrados por modalidade. */
export function moduleNames(modules: Module[], category?: Modality): string[] {
  const filtered = category ? modules.filter((m) => m.category === category) : modules;
  return Array.from(new Set(filtered.map((m) => m.name)));
}

/** Modalidade interna do módulo com esse nome (ou `fallback` se não houver). */
export function modalityOfModule(modules: Module[], name: string, fallback: Modality = DEFAULT_MODALITY): Modality {
  return modules.find((m) => m.name === name)?.category ?? fallback;
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const id = `mod-${Date.now()}`;
      const category = DEFAULT_MODALITY;
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

/**
 * Renomeia uma categoria. `ids` = todos os registros com esse nome (o mesmo
 * nome pode existir em mais de uma modalidade interna). As aulas guardam o
 * nome em `videos.subcategory` (texto, sem chave estrangeira), então também
 * são atualizadas — senão sumiriam da categoria renomeada.
 */
export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, oldName, name }: { ids: string[]; oldName: string; name: string }) => {
      if (!isMockMode()) {
        const { error } = await modulesTable().update({ name }).in("id", ids);
        if (error) throw error;
        const { error: videosError } = await supabase.from("videos").update({ subcategory: name }).eq("subcategory", oldName);
        if (videosError) throw videosError;
        return;
      }
      mockModules.forEach((m) => { if (ids.includes(m.id)) m.name = name; });
      mockVideos.forEach((v) => { if (v.subcategory === oldName) v.subcategory = name; });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      if (!isMockMode()) {
        const { error } = await modulesTable().delete().in("id", ids);
        if (error) throw error;
        return;
      }
      mockModules = mockModules.filter((x) => !ids.includes(x.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}
