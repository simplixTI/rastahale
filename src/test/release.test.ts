import { describe, it, expect } from "vitest";
import { fromLocalInput, isUpcoming, laterRelease, moduleReleaseGate, toLocalInput } from "@/lib/release";

describe("liberação agendada", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");

  it("sem data ou com data passada, a aula está liberada", () => {
    expect(isUpcoming(null, now)).toBe(false);
    expect(isUpcoming("", now)).toBe(false);
    expect(isUpcoming("2026-11-20T12:00:00Z", now)).toBe(false);
  });

  it("com data futura, a aula fica em breve", () => {
    expect(isUpcoming("2026-11-22T12:00:00Z", now)).toBe(true);
  });

  it("ida e volta pelo campo datetime-local preserva o horário", () => {
    const iso = fromLocalInput("2026-12-01T09:30");
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe("2026-12-01T09:30");
    expect(fromLocalInput("")).toBeNull();
  });
});

describe("moduleReleaseGate", () => {
  const now = Date.parse("2026-12-01T12:00:00Z");
  const future = "2026-12-10T12:00:00Z";
  const later = "2026-12-20T12:00:00Z";
  const past = "2026-11-01T12:00:00Z";

  it("aula fora de módulo não fica presa", () => {
    expect(moduleReleaseGate("v1", [{ videoIds: ["v2"], releaseAt: future }], now)).toBeNull();
  });

  it("aula só em módulo agendado fica presa até a data", () => {
    expect(moduleReleaseGate("v1", [{ videoIds: ["v1"], releaseAt: future }], now)).toBe(future);
  });

  it("aula também num módulo liberado fica aberta", () => {
    expect(moduleReleaseGate("v1", [
      { videoIds: ["v1"], releaseAt: future },
      { videoIds: ["v1"], releaseAt: null },
    ], now)).toBeNull();
    expect(moduleReleaseGate("v1", [
      { videoIds: ["v1"], releaseAt: future },
      { videoIds: ["v1"], releaseAt: past },
    ], now)).toBeNull();
  });

  it("em dois módulos agendados, vale a data mais cedo", () => {
    expect(moduleReleaseGate("v1", [
      { videoIds: ["v1"], releaseAt: later },
      { videoIds: ["v1"], releaseAt: future },
    ], now)).toBe(future);
  });

  it("laterRelease escolhe a data mais tarde", () => {
    expect(laterRelease(null, future)).toBe(future);
    expect(laterRelease(later, future)).toBe(later);
    expect(laterRelease(null, null)).toBeNull();
  });
});
