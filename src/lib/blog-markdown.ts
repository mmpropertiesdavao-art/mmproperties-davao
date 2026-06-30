import type { BlogBlock } from "@/lib/blog-blocks";

type ImportedMarkdownPost = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  blocks: BlogBlock[];
};

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

function cleanInline(value: string) {
  return value
    .replace(/\[INTERNAL LINK:\s*([^|\]]+)\|\s*"([^"]+)"\]/gi, (_, url, label) => `[${label.trim()}](${url.trim()})`)
    .replace(/\[INTERNAL LINK:\s*([^\]\s]+)\s+([^\]]+)\]/gi, (_, url, label) => `[${String(label).trim()}](${String(url).trim()})`)
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

function stripMarkdown(value: string) {
  return cleanInline(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFaqJsonLd(markdown: string): BlogBlock[] {
  const match = markdown.match(/"mainEntity"\s*:\s*(\[[\s\S]*?\])\s*\n\s*}\s*\n\s*<\/script>/i);
  if (!match) return [];
  try {
    const questions = JSON.parse(match[1]) as { name?: string; acceptedAnswer?: { text?: string } }[];
    return questions
      .filter((question) => question.name && question.acceptedAnswer?.text)
      .map((question) => ({
        id: id("faq"),
        type: "faq",
        text: question.name,
        caption: question.acceptedAnswer?.text,
      }));
  } catch {
    return [];
  }
}

function bestForText(value?: string) {
  const match = (value || "").match(/^\*\*Best for:\*\*\s*([\s\S]+)$/i) || (value || "").match(/^Best for:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() || "";
}

function isLabel(value: unknown, label: string) {
  return typeof value === "string" && new RegExp(`^\\*\\*${label}:\\*\\*\\s*$|^${label}:\\s*$`, "i").test(value.trim());
}

function convertProsConsPatterns(blocks: BlogBlock[]) {
  const next: BlogBlock[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const current = blocks[index];
    const bestFor = current.type === "paragraph" ? bestForText(current.text) : "";
    const advantagesLabel = blocks[index + 1];
    const advantages = blocks[index + 2];
    const tradeoffsLabel = blocks[index + 3];
    const tradeoffs = blocks[index + 4];
    if (
      bestFor &&
      advantagesLabel?.type === "paragraph" &&
      isLabel(advantagesLabel.text, "Advantages") &&
      advantages?.type === "list" &&
      tradeoffsLabel?.type === "paragraph" &&
      isLabel(tradeoffsLabel.text, "Trade-offs") &&
      tradeoffs?.type === "list"
    ) {
      next.push({
        id: id("pros-cons"),
        type: "pros_cons",
        label: bestFor,
        text: advantages.text || "",
        caption: tradeoffs.text || "",
      });
      index += 4;
    } else {
      next.push(current);
    }
  }
  return next;
}

export function importMarkdownBlog(raw: string): ImportedMarkdownPost {
  const faqBlocks = parseFaqJsonLd(raw);
  let markdown = raw
    .replace(/^\uFEFF/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/## APPENDIX: FAQ Schema[\s\S]*$/i, "")
    .replace(/## APPENDIX: Internal Link Map[\s\S]*$/i, "");

  const seoTitle = stripMarkdown(markdown.match(/\*\*SEO Title:\*\*\s*(.+)/i)?.[1] || "");
  const metaDescription = stripMarkdown(markdown.match(/\*\*Meta Description:\*\*\s*(.+)/i)?.[1] || "");
  const title = stripMarkdown(markdown.match(/^#\s+(.+)$/m)?.[1] || seoTitle.replace(/\s*\|\s*MM Properties.*$/i, "") || "Untitled guide");

  markdown = markdown
    .replace(/^#\s+.+$/m, "")
    .replace(/^\*\*SEO Title:\*\*.*$/gim, "")
    .replace(/^\*\*Meta Description:\*\*.*$/gim, "")
    .replace(/^>\s*\*\*EDITOR'S NOTE[\s\S]*?(?=\n---|\n##|\n#|$)/im, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\r\n/g, "\n");

  const lines = markdown.split("\n");
  const blocks: BlogBlock[] = [];
  let i = 0;
  let skippedFirstH1 = false;

  function pushParagraph(parts: string[]) {
    const text = cleanInline(parts.join("\n").trim());
    if (!text || text === "---") return;
    if (/^\*\s*©\s*2026/i.test(text)) return;
    blocks.push({ id: id("p"), type: "paragraph", text });
  }

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") {
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+?)(?:\s+\{#([^}]+)\})?$/);
    if (heading) {
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      const text = stripMarkdown(heading[2]);
      const anchorId = heading[3] || slugify(text);
      if (level === 1 && !skippedFirstH1) {
        skippedFirstH1 = true;
      } else {
        blocks.push({ id: id("h"), type: "heading", level: level === 1 ? 2 : level, text, anchorId });
      }
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const text = cleanInline(quoteLines.join("\n").trim());
      const label = stripMarkdown(text.split("\n")[0] || "");
      const body = cleanInline(text.split("\n").slice(1).join("\n").trim());
      if (/about this guide|mm insight|key takeaway|cms|developer note/i.test(label)) {
        blocks.push({ id: id("callout"), type: "callout", label: /cms|developer note/i.test(label) ? "Editorial note" : label, text: body || text });
      } else {
        blocks.push({ id: id("quote"), type: "quote", text });
      }
      continue;
    }

    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1].trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }
      blocks.push({ id: id("table"), type: "table", text: tableLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\.\s+/.test(lines[i].trim()) : /^[-*]\s+/.test(lines[i].trim()))) {
        items.push(cleanInline(lines[i].trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")));
        i++;
      }
      blocks.push({ id: id("list"), type: "list", ordered, text: items.join("\n") });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      lines[i].trim() !== "---" &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^\|.+\|$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trimEnd());
      i++;
    }
    const paragraphText = cleanInline(paragraphLines.join("\n"));
    pushParagraph(paragraphLines);
    if (/^(\*\*)?In this guide/i.test(paragraphText) && !blocks.some((block) => block.type === "toc")) {
      blocks.push({ id: id("toc"), type: "toc" });
    }
  }

  if (faqBlocks.length) {
    blocks.push({ id: id("divider"), type: "divider" });
    blocks.push({ id: id("h"), type: "heading", level: 2, text: "Frequently Asked Questions", anchorId: "frequently-asked-questions" });
    blocks.push(...faqBlocks);
  }

  const finalBlocks = convertProsConsPatterns(blocks);
  const firstParagraph = finalBlocks.find((block) => block.type === "paragraph" && block.text)?.text || "";
  return {
    title,
    slug: slugify(title),
    category: "buying_guide",
    excerpt: stripMarkdown(firstParagraph).slice(0, 220),
    seoTitle: seoTitle || title,
    metaDescription: metaDescription || stripMarkdown(firstParagraph).slice(0, 155),
    blocks: finalBlocks.length ? finalBlocks : [{ id: id("p"), type: "paragraph", text: cleanInline(markdown.trim()) }],
  };
}
