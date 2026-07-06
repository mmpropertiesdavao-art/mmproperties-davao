import type { ReactNode } from "react";
import { BuyerReadinessQuiz } from "@/components/blog/BuyerReadinessQuiz";

export type BlogBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "checklist"
  | "quote"
  | "callout"
  | "neighborhood_insight"
  | "pros_cons"
  | "table"
  | "faq"
  | "toc"
  | "image"
  | "button"
  | "internal_link"
  | "related_articles"
  | "buyer_readiness_quiz"
  | "partner_cta"
  | "divider";

export type BlogBlock = {
  id: string;
  type: BlogBlockType;
  text?: string;
  level?: 1 | 2 | 3;
  ordered?: boolean;
  url?: string;
  alt?: string;
  caption?: string;
  partnerType?: "broker" | "appraiser" | "both";
  label?: string;
  anchorId?: string;
};

export type RelatedArticleSummary = {
  id?: string;
  title: string;
  slug: string;
  category?: string;
  coverImageUrl?: string | null;
  excerpt?: string | null;
  content?: string | null;
};

export type BlogHeading = { id: string; text: string; level: 2 | 3 };
export type TocMode = "h2-h3" | "h2" | "hidden";
export type TocSettings = { title: string; mode: TocMode };

export function blocksToText(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => [block.text, block.caption, block.label].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

export function normalizeBlocks(value: unknown, legacyContent = ""): BlogBlock[] {
  if (Array.isArray(value)) {
    return value.filter(isBlock).map((block) => ({ ...block, id: block.id || crypto.randomUUID() }));
  }
  return legacyContent
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((text, index) => ({ id: `legacy-${index}`, type: "paragraph", text }));
}

function isBlock(value: unknown): value is BlogBlock {
  return Boolean(value && typeof value === "object" && "type" in value && typeof (value as BlogBlock).type === "string");
}

function safeHref(value?: string) {
  if (!value) return "#";
  if (value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "#";
  } catch {
    return value.startsWith("/") ? value : "#";
  }
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function headingId(block: BlogBlock) {
  return block.anchorId || (block.text ? slugifyHeading(block.text) : undefined);
}

export function getTocSettings(blocks: BlogBlock[]): TocSettings {
  const toc = blocks.find((block) => block.type === "toc");
  const mode = toc?.caption === "h2" || toc?.caption === "hidden" ? toc.caption : "h2-h3";
  return { title: toc?.label || toc?.text || "Table of Contents", mode };
}

export function getArticleHeadings(blocks: BlogBlock[], mode: TocMode = "h2-h3"): BlogHeading[] {
  if (mode === "hidden") return [];
  return blocks
    .filter((block) => block.type === "heading" && block.level !== 1 && block.text?.trim())
    .filter((block) => mode !== "h2" || (block.level || 2) === 2)
    .map((block) => ({ id: headingId(block) || slugifyHeading(block.text || ""), text: block.text || "", level: (block.level || 2) as 2 | 3 }));
}

function renderInlineMarkdown(text = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      nodes.push(
        <a key={nodes.length} href={safeHref(match[3])} className="font-semibold text-gold-700 underline underline-offset-4 hover:text-navy-900">
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={nodes.length} className="font-bold text-navy-900">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      nodes.push(<em key={nodes.length}>{match[5]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
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

export function getFaqBlocks(blocks: BlogBlock[]) {
  return blocks.filter((block) => block.type === "faq" && block.text?.trim() && block.caption?.trim());
}

export function BlogBlocks({ blocks, relatedPosts = [] }: { blocks: BlogBlock[]; relatedPosts?: RelatedArticleSummary[] }) {
  const headings = getArticleHeadings(blocks);

  return <div className="space-y-5 text-[16px] leading-7 text-navy-700 sm:text-[17px]">{renderBlocksWithFaqGroups(blocks, headings, relatedPosts)}</div>;
}

function renderBlocksWithFaqGroups(blocks: BlogBlock[], headings: { id: string; text: string; level: 1 | 2 | 3 }[], relatedPosts: RelatedArticleSummary[]) {
  const rendered: ReactNode[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type === "toc") {
      continue;
    }
    if (block.type === "faq") {
      const faqs: BlogBlock[] = [];
      let cursor = index;
      while (blocks[cursor]?.type === "faq") {
        faqs.push(blocks[cursor]);
        cursor++;
      }
      rendered.push(<FaqAccordion key={`faq-${block.id}`} faqs={faqs} />);
      index = cursor - 1;
    } else {
      rendered.push(<Block key={block.id} block={block} headings={headings} relatedPosts={relatedPosts} />);
    }
  }
  return rendered;
}

function FaqAccordion({ faqs }: { faqs: BlogBlock[] }) {
  return (
    <section>
      <h2 className="text-3xl font-bold leading-tight text-blue-700">Frequently asked questions</h2>
      <div className="mt-6 overflow-hidden rounded border border-navy-200 bg-white">
        {faqs.map((faq, index) => (
          <details key={faq.id} open={index === 0} className="group border-b border-navy-200 last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-base font-bold leading-6 text-navy-900 marker:hidden hover:bg-navy-50">
              <span>{renderInlineMarkdown(faq.text)}</span>
              <span className="shrink-0 text-2xl leading-none text-navy-800 group-open:hidden">+</span>
              <span className="hidden shrink-0 text-2xl leading-none text-navy-800 group-open:inline">−</span>
            </summary>
            <div className="border-t border-navy-200 px-5 py-5 text-base leading-8 text-navy-800">
              <p className="whitespace-pre-wrap">{renderInlineMarkdown(faq.caption)}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function Block({ block, headings, relatedPosts }: { block: BlogBlock; headings: { id: string; text: string; level: 1 | 2 | 3 }[]; relatedPosts: RelatedArticleSummary[] }): ReactNode {
  if (block.type === "heading") {
    const classes = block.level === 1 ? "text-3xl" : block.level === 2 ? "text-[1.65rem]" : "text-xl";
    const id = headingId(block);
    if (block.level === 1) return <h1 id={id} className={`${classes} scroll-mt-24 pt-4 font-black leading-tight text-navy-950`}>{renderInlineMarkdown(block.text)}</h1>;
    if (block.level === 3) return <h3 id={id} className={`${classes} scroll-mt-24 pt-3 font-black leading-tight text-navy-950`}>{renderInlineMarkdown(block.text)}</h3>;
    return <h2 id={id} className={`${classes} scroll-mt-24 pt-5 font-black leading-tight text-navy-950`}>{renderInlineMarkdown(block.text)}</h2>;
  }

  if (block.type === "paragraph") return <p className="whitespace-pre-wrap">{renderInlineMarkdown(block.text)}</p>;
  if (block.type === "quote") return <blockquote className="border-l-4 border-gold-500 bg-gold-50 px-5 py-4 italic text-navy-700">{renderInlineMarkdown(block.text)}</blockquote>;
  if (block.type === "callout") {
    return (
      <aside className="rounded-2xl border border-gold-300 bg-gold-50 p-5 text-navy-800">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-700">{block.label || "MM Insight"}</p>
        <p className="mt-2 whitespace-pre-wrap">{renderInlineMarkdown(block.text)}</p>
      </aside>
    );
  }
  if (block.type === "neighborhood_insight") {
    const details = parseNeighborhoodInsight(block.caption);
    const rows = [
      ["Character", details.character],
      ["Who buys here", details.buyers],
      ["Market reality", details.market],
      ["Best for", details.bestFor],
      ["Caution", details.caution],
    ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));
    return (
      <section className="rounded-2xl border border-navy-100 bg-navy-50/70 p-6 shadow-sm">
        <div className="border-l-4 border-gold-500 pl-4">
          <h2 className="text-xl font-black leading-7 text-navy-950">{renderInlineMarkdown(block.text || "Neighborhood insight")}</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-gold-700">Davao area insight</p>
        </div>
        <div className="mt-6 space-y-5 text-base leading-8 text-navy-800">
          {rows.map(([label, value]) => (
            <p key={label} className="whitespace-pre-wrap">
              <strong className="font-black text-navy-950">{label}:</strong> {renderInlineMarkdown(value)}
            </p>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "pros_cons") {
    const pros = (block.text || "").split("\n").filter(Boolean);
    const cons = (block.caption || "").split("\n").filter(Boolean);
    return (
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        {block.label && (
          <p className="text-lg font-bold leading-7 text-navy-900">
            <span className="text-gold-700">Best for:</span> {renderInlineMarkdown(block.label)}
          </p>
        )}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <h3 className="font-bold text-green-900">Pros</h3>
            {pros.length ? (
              <ul className="mt-3 space-y-2">
                {pros.map((item, index) => (
                  <li key={index} className="flex gap-2 text-base leading-7 text-green-950">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">✓</span>
                    <span>{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-green-800">Add pro points in the editor.</p>
            )}
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h3 className="font-bold text-amber-900">Cons</h3>
            {cons.length ? (
              <ul className="mt-3 space-y-2">
                {cons.map((item, index) => (
                  <li key={index} className="flex gap-2 text-base leading-7 text-amber-950">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-navy-900">!</span>
                    <span>{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-amber-800">Add con points in the editor.</p>
            )}
          </div>
        </div>
      </section>
    );
  }
  if (block.type === "toc") {
    return headings.length ? (
      <nav className="rounded-2xl border border-navy-100 bg-navy-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-navy-500">In this guide</p>
        <ol className="mt-3 space-y-2 text-base leading-6">
          {headings.map((heading) => (
            <li key={heading.id} className={heading.level === 3 ? "ml-5" : ""}>
              <a href={`#${heading.id}`} className="font-semibold text-navy-800 hover:text-gold-700">
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    ) : null;
  }
  if (block.type === "list") {
    const items = (block.text || "").split("\n").filter(Boolean);
    return block.ordered ? (
      <ol className="list-decimal space-y-2 pl-7">{items.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ol>
    ) : (
      <ul className="list-disc space-y-2 pl-7">{items.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ul>
    );
  }
  if (block.type === "checklist") {
    const items = (block.text || "").split("\n").filter(Boolean);
    return (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gold-500 text-xs font-bold text-gold-700">✓</span>
            <span>{renderInlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "table") {
    const rows = (block.text || "")
      .split("\n")
      .filter(Boolean)
      .filter((row) => !/^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+$/.test(row.replace(/^\||\|$/g, "")))
      .map((row) => row.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    const [head, ...body] = rows;
    return rows.length ? (
      <div className="overflow-x-auto rounded-xl border border-navy-100">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-navy-50">
            {head && <tr>{head.map((cell, i) => <th key={i} className="border-b border-navy-100 px-4 py-3 font-bold text-navy-900">{renderInlineMarkdown(cell)}</th>)}</tr>}
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-t border-navy-100">
                {row.map((cell, j) => <td key={j} className="px-4 py-3 align-top">{renderInlineMarkdown(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : null;
  }
  if (block.type === "faq") {
    return (
      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-xl font-bold text-navy-900">{renderInlineMarkdown(block.text)}</h2>
        <p className="mt-3 whitespace-pre-wrap">{renderInlineMarkdown(block.caption)}</p>
      </section>
    );
  }
  if (block.type === "image") return block.url ? <figure><img src={block.url} alt={block.alt || ""} className="max-h-[620px] w-full rounded-xl object-cover" />{block.caption && <figcaption className="mt-2 text-center text-sm text-navy-400">{block.caption}</figcaption>}</figure> : null;
  if (block.type === "button") return <p><a href={safeHref(block.url)} className="inline-flex rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900 hover:bg-gold-300">{block.text || "Learn more"}</a></p>;
  if (block.type === "internal_link") {
    return (
      <p className="py-1 leading-8">
        <a href={safeHref(block.url)} className="inline-block font-bold text-gold-700 underline underline-offset-4 hover:text-navy-900">
          {block.text || block.url || "Read more"}
        </a>
      </p>
    );
  }
  if (block.type === "related_articles") {
    const related = resolveRelatedArticles(block, relatedPosts);
    return (
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-700">{block.label || "Related reading"}</h2>
        <div className="mt-5 space-y-5">
          {related.length ? related.map((item, index) => (
            <a key={`${item.href}-${index}`} href={safeHref(item.href)} className="group grid gap-4 rounded-xl p-2 transition hover:bg-navy-50 sm:grid-cols-[180px_1fr]">
              <div className="image-zoom-frame h-36 overflow-hidden rounded-lg bg-navy-50 sm:h-32">
                {item.image ? <img src={item.image} alt="" className="zoomable-image h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-4 text-center text-sm text-navy-400">MM Properties guide</div>}
              </div>
              <div className="min-w-0">
                {item.category && <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{item.category}</p>}
                <h3 className="text-lg font-bold leading-6 text-navy-900 group-hover:text-gold-700">{item.title}</h3>
                {item.excerpt && <p className="mt-2 line-clamp-3 text-base leading-7 text-navy-600">{item.excerpt}</p>}
              </div>
            </a>
          )) : <p className="text-sm text-navy-500">Add guide slugs or URLs in the editor to show related articles.</p>}
        </div>
      </section>
    );
  }
  if (block.type === "buyer_readiness_quiz") return <BuyerReadinessQuiz />;
  if (block.type === "partner_cta") {
    const type = block.partnerType || "both";
    const href = type === "both" ? "/signup?profession=broker" : `/signup?profession=${type}`;
    return (
      <aside className="rounded-2xl border border-gold-300 bg-navy-900 p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-300">MM Properties partner network</p>
        <h2 className="mt-2 text-2xl font-bold">{block.text || "Are you a broker or property appraiser?"}</h2>
        <p className="mt-2 text-navy-100">Share your expertise, collaborate on Davao listings, and apply to be featured by MM Properties.</p>
        <a href={href} className="mt-5 inline-flex rounded-md bg-gold-500 px-5 py-3 font-semibold text-navy-900">Apply to be featured</a>
      </aside>
    );
  }
  if (block.type === "divider") return <hr className="border-navy-200" />;
  return null;
}

function articleKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed, "https://mmpropertiesdavao.com");
    return url.pathname.replace(/^\/guides\//, "").replace(/^\/+|\/+$/g, "").toLowerCase();
  } catch {
    return trimmed.replace(/^\/guides\//, "").replace(/^\/+|\/+$/g, "").toLowerCase();
  }
}

function resolveRelatedArticles(block: BlogBlock, posts: RelatedArticleSummary[]) {
  const bySlug = new Map(posts.map((post) => [post.slug.toLowerCase(), post]));
  return (block.text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => {
      const [manualTitle, manualHref, manualImage, manualExcerpt] = line.split("|").map((part) => part.trim());
      const hrefCandidate = manualHref || manualTitle;
      const matched = bySlug.get(articleKey(hrefCandidate));
      if (matched) {
        return {
          title: matched.title,
          href: `/guides/${matched.slug}`,
          image: matched.coverImageUrl || "",
          excerpt: matched.excerpt || matched.content || "",
          category: matched.category,
        };
      }
      return {
        title: manualTitle || hrefCandidate,
        href: hrefCandidate,
        image: manualImage || "",
        excerpt: manualExcerpt || "",
        category: "",
      };
    });
}
