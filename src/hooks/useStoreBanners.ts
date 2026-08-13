import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface StoreBanner {
  id:       string;
  imageUrl: string;
  linkUrl?: string | null;
}

function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

// Tabela `store_banners` não está no tipo gerado do banco — acessa via cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bannersTable = () => (supabase as any).from("store_banners");

// Estado em memória para o modo demo (mock).
let mockBanners: StoreBanner[] = [];
let mockSeq = 0;

/**
 * Lista as fotos do banner da loja, em ordem. Se a tabela ainda não existe
 * (migração 012 não aplicada) ou não há fotos, retorna lista vazia — o
 * componente cai no card simples de fallback.
 */
export function useStoreBanners() {
  return useQuery({
    queryKey: ["store-banners"],
    queryFn: async (): Promise<StoreBanner[]> => {
      if (!isMockMode()) {
        const { data, error } = await bannersTable().select("*").order("sort_order").order("created_at");
        if (!error && data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data as any[]).map((b) => ({ id: b.id, imageUrl: b.image_url, linkUrl: b.link_url }));
        }
        return [];
      }
      return [...mockBanners];
    },

  });
}

export function useCreateStoreBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageUrl, linkUrl, sortOrder }: { imageUrl: string; linkUrl?: string; sortOrder: number }) => {
      if (!isMockMode()) {
        const { error } = await bannersTable().insert({ image_url: imageUrl, link_url: linkUrl || null, sort_order: sortOrder });
        if (error) throw error;
        return;
      }
      mockBanners.push({ id: `banner-${++mockSeq}`, imageUrl, linkUrl: linkUrl || null });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-banners"] }),
  });
}

export function useDeleteStoreBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!isMockMode()) {
        const { error } = await bannersTable().delete().eq("id", id);
        if (error) throw error;
        return;
      }
      mockBanners = mockBanners.filter((b) => b.id !== id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-banners"] }),
  });
}
