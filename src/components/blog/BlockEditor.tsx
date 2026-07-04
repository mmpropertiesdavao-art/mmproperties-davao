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
  { type: "neighborhood_insight", label: "Neighborhood card" },
  { type: "pros_cons", label: "Pros & Cons" },
  { type: "table", label: "Table" },
  { type: "faq", label: "FAQ" },
  { type: "image", label: "Image" },
  { type: "button", label: "Button" },
  { type: "internal_link", label: "Internal link" },
  { type: "related_articles", label: "Related reading" },
  { type: "buyer_readiness_quiz", label: "Buyer quiz" },
  { type: "partner_cta", label: "Invite brokers/appraisers" },
  { type: "divider", label: "Divider" },
];

export const createBlogBlock = (type: BlogBlockType): BlogBlock => ({
  id: crypto.randomUUID(),
  type,
  text: type === "button" ? "Learn more" : type === "partner_cta" ? "Are you a broker or property appraiser?" : type === "callout" ? "" : type === "pros_cons" ? "You own the land—which is typically what appreciates most over time\nMore indoor and outdoor space\nGreater freedom to renovate, expand, or modify" : type === "table" ? "Column 1 | Column 2\nValue 1 | Value 2" : type === "faq" ? "Question?" : "",
  caption: type === "faq" ? "Answer." : type === "pros_cons" ? "Higher entry cost in established neighborhoods\nAll maintenance is your responsibility" : type === "toc" ? "h2-h3" : undefined,
  label: type === "callout" ? "MM Insight" : type === "pros_cons" ? "Families, buyers prioritizing space and permanence, and long-term land ownership." : type === "toc" ? "Table of Contents" : undefined,
  level: type === "heading" ? 2 : undefined,
  partnerType: type === "partner_cta" ? "both" : undefined,
});

export function createEditorBlogBlock(type: BlogBlockType): BlogBlock {
  if (type !== "neighborhood_insight") return createBlogBlock(type);
  return {
    id: crypto.randomUUID(),
    type,
    text: "Poblacion / Downtown Davao",
    caption: JSON.stringify({
      character: "The historic commercial and civic center.",
      buyers: "Commercial investors, business owners, and buyers looking for older residential properties at lower price points.",
      market: "Residential demand is more limited compared to newer districts, but the area is central and active.",
      bestFor: "Commercial property buyers, heritage or mixed-use investors, and buyers comfortable with urban density.",
      caution: "Less suitable as a primary family residence for buyers accustomed to subdivision living.",
    }),
  };
}

function addMarkdown(value: string | undefined, kind: "bold" | "italic" | "link") {
  const current = value || "";
  const spacer = current && !current.endsWith(" ") && !current.endsWith("\n") ? " " : "";
  if (kind === "bold") return `${current}${spacer}**bold text**`;
  if (kind === "italic") return `${current}${spacer}*italic text*`;
  return `${current}${spacer}[link text](https://example.com)`;
}

function FormatButtons({ onInsert }: { onInsert: (kind: "bold" | "italic" | "link") => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => onInsert("bold")} className="rounded border border-navy-200 px-2 py-1 text-xs font-bold hover:border-gold-400">
        Bold
      </button>
      <button type="button" onClick={() => onInsert("italic")} className="rounded border border-navy-200 px-2 py-1 text-xs italic hover:border-gold-400">
        Italic
      </button>
      <button type="button" onClick={() => onInsert("link")} className="rounded border border-navy-200 px-2 py-1 text-xs underline hover:border-gold-400">
        Link
      </button>
    </div>
  );
}

type NeighborhoodInsight = {
  character: string;
  buyers: string;
  market: string;
  bestFor: string;
  caution: string;
};

function parseNeighborhoodInsight(value?: string): NeighborhoodInsight {
  try {
    const parsed = JSON.parse(value || "{}") as Partial<NeighborhoodInsight>;
    return {
      character: parsed.character || "",
      buyers: parsed.buyers || "",
      market: parsed.market || "",
      bestFor: parsed.bestFor || "",
      caution: parsed.caution || "",
    };
  } catch {
    return { character: "", buyers: "", market: "", bestFor: "", caution: value || "" };
  }
}

function updateNeighborhoodInsight(value: string | undefined, key: keyof NeighborhoodInsight, nextValue: string) {
  return JSON.stringify({ ...parseNeighborhoodInsight(value), [key]: nextValue });
}

export function BlockEditor({ value, onChange }: { value: BlogBlock[]; onChange: (blocks: BlogBlock[]) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const update = (index: number, patch: Partial<BlogBlock>) => onChange(value.map((block, itemIndex) => (index === itemIndex ? { ...block, ...patch } : block)));

  const insert = (type: BlogBlockType, index = value.length) => {
    const next = [...value];
    next.splice(index, 0, createEditorBlogBlock(type));
    onChange(next);
    setInsertIndex(null);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const blockLabel = (type: BlogBlockType) => {
    if (type === "pros_cons") return "pros & cons";
    if (type === "partner_cta") return "invite brokers/appraisers";
    if (type === "related_articles") return "related reading";
    if (type === "buyer_readiness_quiz") return "buyer readiness quiz";
    if (type === "neighborhood_insight") return "neighborhood card";
    return type.replace("_", " ");
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
    <div className="grid gap-5">
      <div className="space-y-3">
        <InsertBlockButton open={insertIndex === 0} onOpen={() => setInsertIndex(insertIndex === 0 ? null : 0)} onInsert={(type) => insert(type, 0)} />
        {value.map((block, index) => (
          <div
            key={block.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingIndex !== null) reorder(draggingIndex, index);
              setDraggingIndex(null);
            }}
          >
            <div className={`rounded-lg border bg-white p-4 transition ${draggingIndex === index ? "border-gold-400 opacity-60 ring-2 ring-gold-100" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggingIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingIndex(null)}
                  className="cursor-grab rounded border border-navy-200 px-2 py-1 text-xs font-bold text-navy-500 active:cursor-grabbing"
                  aria-label={`Drag ${blockLabel(block.type)} block`}
                  title="Drag to reorder"
                >
                  ⋮⋮
                </button>
                <span className="text-xs font-bold uppercase text-navy-400">{blockLabel(block.type)}</span>
              </div>
              <div className="flex flex-wrap gap-3">
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
              <>
                <FormatButtons onInsert={(kind) => update(index, { text: addMarkdown(block.text, kind) })} />
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} className="w-full rounded border p-2" />
              </>
            )}

            {block.type === "toc" && (
              <div className="space-y-3 rounded-lg bg-navy-50 p-3 text-sm text-navy-600">
                <p>This controls the article table of contents. It appears as a sticky left sidebar on desktop and a drawer on mobile.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase text-navy-400">TOC title</span>
                    <input value={block.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Table of Contents" className="rounded border p-2" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase text-navy-400">Show headings</span>
                    <select value={block.caption || "h2-h3"} onChange={(event) => update(index, { caption: event.target.value })} className="rounded border p-2">
                      <option value="h2-h3">H2 and H3</option>
                      <option value="h2">H2 only</option>
                      <option value="hidden">Hide TOC</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {block.type === "list" && (
              <>
                <label className="text-xs">
                  <input type="checkbox" checked={!!block.ordered} onChange={(event) => update(index, { ordered: event.target.checked })} /> Numbered
                </label>
                <FormatButtons onInsert={(kind) => update(index, { text: addMarkdown(block.text, kind) })} />
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} placeholder="One item per line" className="mt-2 w-full rounded border p-2" />
              </>
            )}

            {block.type === "checklist" && (
              <>
                <FormatButtons onInsert={(kind) => update(index, { text: addMarkdown(block.text, kind) })} />
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={5} placeholder="One checklist item per line" className="w-full rounded border p-2" />
              </>
            )}

            {block.type === "callout" && (
              <div className="space-y-2">
                <input value={block.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Label, e.g. MM Insight" className="w-full rounded border p-2" />
                <FormatButtons onInsert={(kind) => update(index, { text: addMarkdown(block.text, kind) })} />
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={4} placeholder="Callout text" className="w-full rounded border p-2" />
              </div>
            )}

            {block.type === "neighborhood_insight" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-navy-400">Area / neighborhood name</label>
                  <input value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} placeholder="Poblacion / Downtown Davao" className="w-full rounded border p-2" />
                </div>
                {([
                  ["character", "Character"],
                  ["buyers", "Who buys here"],
                  ["market", "Market reality"],
                  ["bestFor", "Best for"],
                  ["caution", "Caution"],
                ] as [keyof NeighborhoodInsight, string][]).map(([key, label]) => {
                  const details = parseNeighborhoodInsight(block.caption);
                  return (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-bold uppercase text-navy-400">{label}</label>
                      <FormatButtons onInsert={(kind) => update(index, { caption: updateNeighborhoodInsight(block.caption, key, addMarkdown(details[key], kind)) })} />
                      <textarea value={details[key]} onChange={(event) => update(index, { caption: updateNeighborhoodInsight(block.caption, key, event.target.value) })} rows={3} className="w-full rounded border p-2" />
                    </div>
                  );
                })}
              </div>
            )}

            {block.type === "pros_cons" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-navy-400">Best for</label>
                  <input value={block.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Families, investors, first-time buyers..." className="w-full rounded border p-2" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-green-700">Pros</label>
                    <FormatButtons onInsert={(kind) => update(index, { text: addMarkdown(block.text, kind) })} />
                    <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={6} placeholder="One pro per line" className="w-full rounded border p-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-amber-700">Cons</label>
                    <FormatButtons onInsert={(kind) => update(index, { caption: addMarkdown(block.caption, kind) })} />
                    <textarea value={block.caption || ""} onChange={(event) => update(index, { caption: event.target.value })} rows={6} placeholder="One con per line" className="w-full rounded border p-2" />
                  </div>
                </div>
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
                <FormatButtons onInsert={(kind) => update(index, { caption: addMarkdown(block.caption, kind) })} />
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

            {block.type === "related_articles" && (
              <div className="space-y-2">
                <input value={block.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Related reading" className="w-full rounded border p-2" />
                <p className="text-xs text-navy-500">Add one guide slug or URL per line. The published article will use each guide's featured image, title, and excerpt automatically.</p>
                <textarea value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} rows={5} placeholder="/guides/buying-property-in-davao&#10;another-guide-slug" className="w-full rounded border p-2" />
              </div>
            )}

            {block.type === "buyer_readiness_quiz" && (
              <div className="rounded-lg border border-gold-200 bg-gold-50 p-4 text-sm leading-6 text-navy-700">
                <p className="font-bold text-navy-900">Interactive Buyer Readiness Quiz</p>
                <p className="mt-1">This renders a 10-question score-based quiz in the published article. Ready and almost-ready results send visitors to MM Pulse at <code>/matcher</code> with no login required.</p>
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
            <InsertBlockButton open={insertIndex === index + 1} onOpen={() => setInsertIndex(insertIndex === index + 1 ? null : index + 1)} onInsert={(type) => insert(type, index + 1)} />
          </div>
        ))}
      </div>

      <aside className="hidden">
        <div className="rounded-xl border border-navy-100 bg-navy-50 p-4">
          <p className="text-sm font-bold text-navy-900">Add content blocks</p>
          <p className="mt-1 text-xs text-navy-500">Click to add at the end, or use “Add block here” between existing sections.</p>
          <BlogBlockPalette onInsert={(type) => insert(type)} className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1" />
        </div>
      </aside>
    </div>
  );
}

export function BlogBlockPalette({ onInsert, className }: { onInsert: (type: BlogBlockType) => void; className?: string }) {
  return (
    <div className={className || "flex flex-wrap gap-2"}>
      {buttons.map((button) => (
        <button
          key={button.type}
          type="button"
          onClick={() => onInsert(button.type)}
          className="min-h-10 rounded-md border bg-white px-3 py-2 text-left text-sm font-medium text-navy-800 hover:border-gold-400 hover:bg-gold-50"
        >
          + {button.label}
        </button>
      ))}
    </div>
  );
}

function InsertBlockButton({ open, onOpen, onInsert }: { open: boolean; onOpen: () => void; onInsert: (type: BlogBlockType) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-navy-200 bg-white/70 p-2">
      <button type="button" onClick={onOpen} className="w-full rounded-md px-3 py-2 text-sm font-semibold text-navy-500 hover:bg-gold-50 hover:text-navy-900">
        + Add block here
      </button>
      {open && <BlogBlockPalette onInsert={onInsert} className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" />}
    </div>
  );
}
