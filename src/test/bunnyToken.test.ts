import { describe, it, expect } from "vitest";
import { signBunnyPlaylistUrl } from "../../supabase/functions/_shared/bunnyToken";

const GUID = "3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b";

describe("signBunnyPlaylistUrl", () => {
  it("gera a mesma URL que a implementação de referência do Bunny", async () => {
    // Valor gerado por BunnyCDN.TokenAuthentication/nodejs/token.js (signUrl com isDirectory).
    const signed = await signBunnyPlaylistUrl(
      `https://vz-teste-123.b-cdn.net/${GUID}/playlist.m3u8`,
      "chave-de-teste",
      1800000000,
    );
    expect(signed).toBe(
      "https://vz-teste-123.b-cdn.net/bcdn_token=HS256-8Q6_YHeZ_dxHv9sOhOOrHhg2YI31hN780Ezcfyuruiw" +
      `&token_path=%2F${GUID}%2F&expires=1800000000/${GUID}/playlist.m3u8`,
    );
  });
});
