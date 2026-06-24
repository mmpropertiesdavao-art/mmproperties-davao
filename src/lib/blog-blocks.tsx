import type { ReactNode } from "react";

export type BlogBlockType = "paragraph" | "heading" | "list" | "quote" | "image" | "button" | "partner_cta" | "divider";
export type BlogBlock = { id: string; type: BlogBlockType; text?: string; level?: 1 | 2 | 3; ordered?: boolean; url?: string; alt?: string; caption?: string; partnerType?: "broker"|"appraiser"|"both" };

export function blocksToText(blocks: BlogBlock[]): string {
  return blocks.map(block => block.text || block.caption || "").filter(Boolean).join("\n\n");
}

export function normalizeBlocks(value: unknown, legacyContent = ""): BlogBlock[] {
  if (Array.isArray(value)) return value.filter(isBlock).map(block => ({ ...block, id: block.id || crypto.randomUUID() }));
  return legacyContent.split(/\n\s*\n/).filter(Boolean).map((text, index) => ({ id: `legacy-${index}`, type: "paragraph", text }));
}

function isBlock(value: unknown): value is BlogBlock { return Boolean(value && typeof value === "object" && "type" in value && typeof (value as BlogBlock).type === "string"); }
function safeHref(value?: string) { if (!value) return "#"; try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? value : "#"; } catch { return value.startsWith("/") ? value : "#"; } }

export function BlogBlocks({ blocks }: { blocks: BlogBlock[] }) {
  return <div className="space-y-6 text-lg leading-8 text-navy-700">{blocks.map(block => <Block key={block.id} block={block}/>)}</div>;
}

function Block({ block }: { block: BlogBlock }): ReactNode {
  if (block.type === "heading") {
    const classes = block.level === 1 ? "text-3xl" : block.level === 2 ? "text-2xl" : "text-xl";
    if (block.level === 1) return <h1 className={`${classes} pt-3 font-bold leading-tight text-navy-900`}>{block.text}</h1>;
    if (block.level === 3) return <h3 className={`${classes} pt-3 font-bold leading-tight text-navy-900`}>{block.text}</h3>;
    return <h2 className={`${classes} pt-3 font-bold leading-tight text-navy-900`}>{block.text}</h2>;
  }
  if (block.type === "paragraph") return <p className="whitespace-pre-wrap">{block.text}</p>;
  if (block.type === "quote") return <blockquote className="border-l-4 border-gold-500 bg-gold-50 px-5 py-4 italic text-navy-700">{block.text}</blockquote>;
  if (block.type === "list") { const items = (block.text || "").split("\n").filter(Boolean); return block.ordered ? <ol className="list-decimal space-y-2 pl-7">{items.map((item,i)=><li key={i}>{item}</li>)}</ol> : <ul className="list-disc space-y-2 pl-7">{items.map((item,i)=><li key={i}>{item}</li>)}</ul>; }
  if (block.type === "image") return block.url ? <figure><img src={block.url} alt={block.alt || ""} className="max-h-[620px] w-full rounded-xl object-cover"/>{block.caption&&<figcaption className="mt-2 text-center text-sm text-navy-400">{block.caption}</figcaption>}</figure> : null;
  if (block.type === "button") return <p><a href={safeHref(block.url)} className="inline-flex rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900 hover:bg-gold-300">{block.text || "Learn more"}</a></p>;
  if(block.type==="partner_cta"){const type=block.partnerType||"both";const href=type==="both"?"/signup?profession=broker":`/signup?profession=${type}`;return <aside className="rounded-2xl border border-gold-300 bg-navy-900 p-7 text-white"><p className="text-xs font-bold uppercase tracking-widest text-gold-300">MM Properties partner network</p><h2 className="mt-2 text-2xl font-bold">{block.text||"Are you a broker or property appraiser?"}</h2><p className="mt-2 text-navy-100">Share your expertise, collaborate on Davao listings, and apply to be featured by MM Properties.</p><a href={href} className="mt-5 inline-flex rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900">Apply to be featured</a></aside>}
  if (block.type === "divider") return <hr className="border-navy-200"/>;
  return null;
}
