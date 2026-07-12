// src/lib/slugify.ts
export function slugify(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeSuffix = suffix
    ? String(suffix)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
  const fallback = safeSuffix ? "listing" : "";
  const safeBase = base || fallback;
  if (!safeBase) return "";
  return safeSuffix ? `${safeBase}-${safeSuffix}` : safeBase;
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());
}
