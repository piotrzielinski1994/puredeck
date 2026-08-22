import { describe, expect, it } from "vitest";
import { demoFiles, demoSettings } from "@/lib/collection/demo-seed";
import { decksFromFileMap } from "@/lib/workspace/collection";

describe("demo-seed (AC-002 / TC-002)", () => {
  it("should return a file map whose decksFromFileMap yields the seeded decks", () => {
    const decks = decksFromFileMap(demoFiles());

    expect(decks.length).toBeGreaterThan(0);
    expect(decks.some((deck) => deck.name === "Spanish")).toBe(true);
    expect(decks.some((deck) => deck.name === "Capitals")).toBe(true);
    expect(decks.some((deck) => deck.name === "Verbs")).toBe(true);
  });

  it("should keep card ids, fronts and backs intact through the round trip", () => {
    const decks = decksFromFileMap(demoFiles());
    const spanish = decks.find((deck) => deck.name === "Spanish");

    expect(spanish).toBeDefined();
    expect(spanish?.cards).toContainEqual({
      id: "es-1",
      front: "hola",
      back: "hello",
    });
  });

  it("should return a settings object", () => {
    const settings = demoSettings();

    expect(settings.version).toBe(1);
    expect(settings.sidebarCollapsed).toBe(false);
  });
});
