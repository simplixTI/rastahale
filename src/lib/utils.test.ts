import { describe, it, expect } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("junta classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignora valores falsy", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("resolve conflitos do Tailwind (última classe vence)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("suporta objetos e arrays", () => {
    expect(cn(["foo", { bar: true, baz: false }])).toBe("foo bar");
  });
});
