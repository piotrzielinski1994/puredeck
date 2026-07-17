export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

export function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const nextSuffix = (start: number): string => {
    const candidate = `${base}-${start}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    return nextSuffix(start + 1);
  };
  return nextSuffix(2);
}
