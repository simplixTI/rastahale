import { describe, it, expect } from "vitest";
import { bunnyVideoIdFromUrl, isHlsUrl } from "@/lib/bunnyStream";

const GUID = "3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b";

describe("bunnyVideoIdFromUrl", () => {
  it("extrai o GUID da playlist HLS do Bunny", () => {
    expect(bunnyVideoIdFromUrl(`https://vz-abc123-456.b-cdn.net/${GUID}/playlist.m3u8`)).toBe(GUID);
    expect(bunnyVideoIdFromUrl(`https://videos.rastahale.com/${GUID}/playlist.m3u8?token=x`)).toBe(GUID);
  });

  it("ignora URLs que não são do Bunny", () => {
    for (const url of [
      null, undefined, "",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      `https://x.supabase.co/storage/v1/object/public/media/videos/${GUID}.mp4`,
      "https://cdn.example.com/aula/playlist.m3u8",
    ]) {
      expect(bunnyVideoIdFromUrl(url)).toBeNull();
    }
  });
});

describe("isHlsUrl", () => {
  it("reconhece playlists .m3u8", () => {
    expect(isHlsUrl(`https://vz-abc.b-cdn.net/${GUID}/playlist.m3u8`)).toBe(true);
    expect(isHlsUrl("https://cdn.example.com/a.m3u8?token=1")).toBe(true);
    expect(isHlsUrl("https://cdn.example.com/aula.mp4")).toBe(false);
  });
});
