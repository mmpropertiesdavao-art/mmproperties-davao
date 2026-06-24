// src/lib/slugify.ts
export function slugify(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return suffix ? `${base}-${suffix}` : base;
}
