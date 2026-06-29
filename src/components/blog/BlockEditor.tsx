"use client";

import { useState } from "react";
import type { BlogBlock, BlogBlockType } from "@/lib/blog-blocks";

export async function uploadBlogImage(file: File) {
  const form = new FormData();
  form.append("file", await optimize(file));
  const response = await fetch("/api/admin/blog/upload", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Image upload failed.");
  return data.url as string;
}

async function optimize(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

const buttons: { type: BlogBlockType; label: string }[] = [
  { type: "paragraph", label: "Text" },
  { type: "heading", label: "Heading" },
  { type: "toc", label: "Table of contents" },
  { type: "list", label: "List" },
  { type: "checklist", label: "Checklist" },
  { type: "quote", label: "Quote" },
  { type: "callout", label: "MM Insight" },
  { type: "table", label: "Table" },
  { type: "faq", label: "FAQ" },
  { type: "image", label: "Image" },
  { type: "button", label: "Button" },
  { type: "internal_link", label: "Internal link" },
  { type: "partner_cta", label: "Invite brokers/appraisers" },
  { type: "divider", label: "Divider" },
];

const fresh = (type: BlogBlockType): BlogBlock => ({
  id: crypto.randomUUID(),
  type,
  text: type === "button" ? "Learn more" : type === "partner_cta" ? "Are you a broker or property appraiser?" : type === "callout" ? "" : type === "table" ? "Column 1 | Column 2\nValue 1 | Value 2" : type === "faq" ? "Question?" : "",
  caption: type === "faq" ? "Answer." : undefined,
  label: type === "callout" ? "MM Insight" : undefined,
  level: type === "heading" ? 2 : undefined,
  partnerType: type === "partner_cta" ? "both" : undefined,
});

export function BlockEditor({ value, onChange }: { value: BlogBlock[]; onChange: (blocks: BlogBlock[]) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const update = (index: number, patch: Partial<BlogBlock>) => onChange(value.map((block, itemIndex) => (index === itemIndex ? { ...block, ...patch } : block)));
  const move = (index: number, direction: number) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  async function image(index: number, file?: File) {
    if (!file) return;
    setUploading(value[index].id);
    try {
      update(index, { url: await uploadBlogImage(file), alt: file.name.replace(/\.[^.]+$/, "") });
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-lg border bg-navy-50 p-3">
        {buttons.map((button) => (
          <button
            key={button.type}
            type="button"
            onClick={() => onChange([...value, fresh(button.type)])}
            className="rounded-md border bg-white px-3 py-2 text-sm hover:border-gold-400"
          >
            + {button.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {value.map((block, index) => (
          <div key={block.id} className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase text-navy-400">{block.type.replace("_", " ")}</span>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => move(index, -1)}>Up</button>
                <button type="button" onClick={() => move(index, 1)}>Down</button>
                <button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600">
                  Remove
                </button>
              </div>
            </div>

            {block.type === "heading" && (
              <div className="grid gap-2 sm:grid-cols-[90px_1fr]">
                <select value={block.level || 2} onChange={(event) => update(index, { level: +event.target.value as 1 | 2 | 3 })} className="rounded border p-2">
                  <option value="1">H1</option>
                  <option value="2">H2</option>
                  <option value="3">H3</option>
                </select>
                <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} className="w-full rounded border p-2" />
              </div>
            )}

            {["paragraph", "quote"].includes(block.type) && (
              <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} className="w-full rounded border p-2" />
            )}

            {block.type === "toc" && (
              <p className="rounded-lg bg-navy-50 p-3 text-sm text-navy-500">This automatically lists the H2 and H3 headings in the article.</p>
            )}

            {block.type === "list" && (
              <>
                <label className="text-xs">
                  <input type="checkbox" checked={!!block.ordered} onChange={(event) => update(index, { ordered: event.target.checked })} /> Numbered
                </label>
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} placeholder="One item per line" className="mt-2 w-full rounded border p-2" />
              </>
            )}

            {block.type === "checklist" && (
              <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={5} placeholder="One checklist item per line" className="w-full rounded border p-2" />
            )}

            {block.type === "callout" && (
              <div className="space-y-2">
                <input value={block.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Label, e.g. MM Insight" className="w-full rounded border p-2" />
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} placeholder="Callout text" className="w-full rounded border p-2" />
              </div>
            )}

            {block.type === "table" && (
              <div>
                <p className="mb-2 text-xs text-navy-500">Use one row per line and separate columns with <code>|</code>. First row becomes the table header.</p>
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={5} className="w-full rounded border p-2" />
              </div>
            )}

            {block.type === "faq" && (
              <div className="space-y-2">
                <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} placeholder="Question" className="w-full rounded border p-2" />
                <textarea value={block.caption || ""} onChange={(event) => update(index, { caption: event.target.value })} rows={4} placeholder="Answer" className="w-full rounded border p-2" />
              </div>
            )}

            {block.type === "image" && (
              <div>
                {block.url && <img src={block.url} alt="" className="mb-3 max-h-64 w-full object-cover" />}
                <input type="file" accept="image/*" onChange={(event) => void image(index, event.target.files?.[0])} className="w-full text-sm" />
                {uploading === block.id && <p>Uploading...</p>}
                <input value={block.alt || ""} onChange={(event) => update(index, { alt: event.target.value })} placeholder="Alt text" className="mt-2 w-full rounded border p-2" />
              </div>
            )}

            {block.type === "button" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} placeholder="Label" className="rounded border p-2" />
                <input value={block.url || ""} onChange={(event) => update(index, { url: event.target.value })} placeholder="URL" className="rounded border p-2" />
              </div>
            )}

            {block.type === "internal_link" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} placeholder="Anchor text" className="rounded border p-2" />
                <input value={block.url || ""} onChange={(event) => update(index, { url: event.target.value })} placeholder="/guides/example-slug" className="rounded border p-2" />
              </div>
            )}

            {block.type === "partner_cta" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} placeholder="Invitation headline" className="rounded border p-2" />
                <select value={block.partnerType || "both"} onChange={(event) => update(index, { partnerType: event.target.value as BlogBlock["partnerType"] })} className="rounded border p-2">
                  <option value="both">Brokers and appraisers</option>
                  <option value="broker">Brokers</option>
                  <option value="appraiser">Appraisers</option>
                </select>
              </div>
            )}

            {block.type === "divider" && <hr />}
          </div>
        ))}
      </div>
    </div>
  );
}
