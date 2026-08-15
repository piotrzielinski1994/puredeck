import type { LogLine } from "@/lib/workspace/log-line";

const KV_FIELDS = ["email"] as const;

type SearchTerm =
  | { kind: "field"; field: string; value: string }
  | { kind: "bare"; value: string };

function tokenize(query: string): string[] {
  return query.match(/(?:"[^"]*"|[^\s"])+/g) ?? [];
}

function isKnownField(field: string): boolean {
  return (
    field === "level" || field === "message" || KV_FIELDS.some((f) => f === field)
  );
}

function parseToken(token: string): SearchTerm {
  const colon = token.indexOf(":");
  if (colon > 0) {
    const field = token.slice(0, colon).toLowerCase();
    if (isKnownField(field)) {
      return {
        kind: "field",
        field,
        value: stripQuotes(token.slice(colon + 1)),
      };
    }
  }
  return { kind: "bare", value: token };
}

function stripQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function fieldValue(line: LogLine, field: string): string {
  if (field === "level") {
    return line.level;
  }
  if (field === "message") {
    return line.message;
  }
  return line.kv[field] ?? "";
}

function matches(line: LogLine, term: SearchTerm): boolean {
  const haystack =
    term.kind === "field" ? fieldValue(line, term.field) : line.raw;
  return haystack.toLowerCase().includes(term.value.toLowerCase());
}

export function filterLogLines(lines: LogLine[], query: string): LogLine[] {
  const terms = tokenize(query).map(parseToken);
  if (terms.length === 0) {
    return lines;
  }
  return lines.filter((line) => terms.every((term) => matches(line, term)));
}

export type HighlightSegment = {
  text: string;
  kind: "key" | "value" | "plain";
};

export function highlightLogSearch(query: string): HighlightSegment[] {
  if (query === "") {
    return [];
  }
  const parts = query.split(/(\s+)/);
  const segments: HighlightSegment[] = [];
  for (const part of parts) {
    if (part === "") {
      continue;
    }
    const colon = part.indexOf(":");
    if (colon > 0) {
      segments.push({ text: part.slice(0, colon + 1), kind: "key" });
      const rest = part.slice(colon + 1);
      if (rest !== "") {
        segments.push({ text: rest, kind: "value" });
      }
      continue;
    }
    segments.push({ text: part, kind: "plain" });
  }
  return segments;
}
