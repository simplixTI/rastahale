import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Com o Supabase configurado, dado de demonstração nunca pode aparecer.
const result = vi.hoisted(() => ({ current: { data: null as unknown, error: null as unknown } }));

vi.mock("@/lib/supabase", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    then: (resolve: (value: unknown) => void) => resolve(result.current),
  };
  return { isSupabaseConfigured: true, supabase: { from: () => chain } };
});

import { useVideos } from "@/hooks/useVideos";
import { useInstructors } from "@/hooks/useInstructors";
import { useAdminUsers, useAdminPlans } from "@/hooks/useAdminData";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const hooks: Record<string, () => UseQueryResult<unknown[]>> = {
  useVideos:      () => useVideos("3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b"),
  useInstructors: () => useInstructors(),
  useAdminUsers:  () => useAdminUsers(),
  useAdminPlans:  () => useAdminPlans(),
};

describe.each(Object.entries(hooks))("%s com Supabase configurado", (_name, useHook) => {
  beforeEach(() => { result.current = { data: null, error: null }; });

  it("banco vazio devolve lista vazia, não dados de demonstração", async () => {
    result.current = { data: [], error: null };
    const { result: hook } = renderHook(useHook, { wrapper });
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    expect(hook.current.data).toEqual([]);
  });

  it("falha do banco vira erro, não dados de demonstração", async () => {
    result.current = { data: null, error: { message: "falhou" } };
    const { result: hook } = renderHook(useHook, { wrapper });
    await waitFor(() => expect(hook.current.isError).toBe(true));
    expect(hook.current.data).toBeUndefined();
  });
});
