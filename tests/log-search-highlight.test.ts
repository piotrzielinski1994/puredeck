import { describe, expect, it } from "vitest";

// F1 - RED: overlay-highlight segmentation of the search query. `highlightLogSearch`
// does not exist yet - the import fails until `@/lib/workspace/log-search` ships.
import { highlightLogSearch } from "@/lib/workspace/log-search";

// The concatenation of every segment's text must reproduce the input verbatim
// (the overlay must align 1:1 with the real input).
function joined(query: string): string {
  return highlightLogSearch(query)
    .map((seg) => seg.text)
    .join("");
}

describe("highlightLogSearch (AC-014 / TC-009)", () => {
  it("should split a field token into key and value segments and leave bare terms and spaces plain", () => {
    expect(highlightLogSearch("level:error account:foo bar")).toEqual([
      { text: "level:", kind: "key" },
      { text: "error", kind: "value" },
      { text: " ", kind: "plain" },
      { text: "account:", kind: "key" },
      { text: "foo", kind: "value" },
      { text: " ", kind: "plain" },
      { text: "bar", kind: "plain" },
    ]);
  });

  it("should mark any key prefix, even an unknown field", () => {
    expect(highlightLogSearch("account:foo")).toEqual([
      { text: "account:", kind: "key" },
      { text: "foo", kind: "value" },
    ]);
  });

  it("should leave a bare term plain", () => {
    expect(highlightLogSearch("refused")).toEqual([
      { text: "refused", kind: "plain" },
    ]);
  });

  it("should return no segments for an empty query", () => {
    expect(highlightLogSearch("")).toEqual([]);
  });

  it("should reconstruct the input verbatim for a quoted field value", () => {
    expect(joined('message:"connection refused" level:error')).toBe(
      'message:"connection refused" level:error',
    );
  });

  it("should preserve surrounding whitespace verbatim", () => {
    expect(joined("  level:error   account:foo  ")).toBe(
      "  level:error   account:foo  ",
    );
  });
});
