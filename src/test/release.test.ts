import { describe, it, expect } from "vitest";
import { fromLocalInput, isUpcoming, toLocalInput } from "@/lib/release";

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
