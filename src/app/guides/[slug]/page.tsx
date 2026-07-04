import { notFound } from "next/navigation";
import { BlogShareButton } from "@/components/blog/BlogShareButton";
import { BLOG_CATEGORY_LABELS, getPublishedPost, getPublishedPosts } from "@/lib/blog";
import { BlogBlocks, getArticleHeadings, getFaqBlocks, getTocSettings, type BlogHeading } from "@/lib/blog-blocks";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  return post
    ? {
        title: post.seoTitle || post.title,
        description: post.metaDescription || post.excerpt,
        alternates: { canonical: `https://mmpropertiesdavao.com/guides/${post.slug}` },
        openGraph: {
          title: post.seoTitle || post.title,
          description: post.metaDescription || post.excerpt || undefined,
          url: `https://mmpropertiesdavao.com/guides/${post.slug}`,
          type: "article",
          images: post.coverImageUrl ? [post.coverImageUrl] : [],
        },
        twitter: {
          card: "summary_large_image",
          title: post.seoTitle || post.title,
          description: post.metaDescription || post.excerpt || undefined,
          images: post.coverImageUrl ? [post.coverImageUrl] : [],
        },
      }
    : {};
}

export const dynamic = "force-dynamic";

export default async function GuidePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();

  const relatedPosts = (await getPublishedPosts()).filter((item) => item.id !== post.id);
  const faqs = getFaqBlocks(post.contentJson);
  const tocSettings = getTocSettings(post.contentJson);
  const headings = getArticleHeadings(post.contentJson, tocSettings.mode);
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const updatedDate = post.updatedAt ? new Date(post.updatedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : publishedDate;
  const faqJsonLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.text,
          acceptedAnswer: { "@type": "Answer", text: faq.caption },
        })),
      }
    : null;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || post.content.slice(0, 155),
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Organization", name: "MM Properties Davao", url: "https://mmpropertiesdavao.com/about" },
    publisher: { "@type": "Organization", name: "MM Properties Davao", logo: { "@type": "ImageObject", url: "https://mmpropertiesdavao.com/mm-favicon.png" } },
    mainEntityOfPage: `https://mmpropertiesdavao.com/guides/${post.slug}`,
  };

  return (
    <main className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[230px_minmax(0,760px)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ArticleToc title={tocSettings.title} headings={headings} />
          </div>
        </aside>

        <article className="min-w-0">
          <header>
            <p className="text-center text-xs font-black uppercase tracking-[.22em] text-gold-700">{BLOG_CATEGORY_LABELS[post.category] ?? post.category}</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-center text-3xl font-black leading-tight tracking-tight text-navy-900 sm:text-4xl">
              {post.title}
            </h1>

            <div className="mt-6 flex flex-col gap-4 border-b border-navy-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <a href="/about" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-navy-100 bg-white shadow-sm">
                  <img src="/mm-favicon.png" alt="MM Properties" className="h-full w-full object-cover" />
                </span>
                <span className="text-sm leading-5 text-navy-500">
                  <span className="block">
                    By <span className="font-bold text-blue-700 underline-offset-4 group-hover:underline">MM Properties Davao</span>
                  </span>
                  <span className="block">Updated {updatedDate}</span>
                </span>
              </a>
              <BlogShareButton title={post.title} />
            </div>

            {headings.length > 0 && (
              <details className="mt-6 rounded-xl border border-navy-100 bg-navy-50 p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-black text-blue-700">{tocSettings.title}</summary>
                <ArticleToc title="" headings={headings} compact />
              </details>
            )}

            {post.excerpt && <p className="mt-7 text-[17px] leading-8 text-navy-700">{post.excerpt}</p>}
            <p className="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm leading-6 text-navy-600">
              This guide is educational and maintained for Davao property buyers, sellers, and investors. For decisions specific to your situation, consult a licensed attorney, accountant, broker, or financing professional.
            </p>
            {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-8 max-h-[420px] w-full rounded-xl object-cover" />}
          </header>

          <div className="mt-8">
            <BlogBlocks blocks={post.contentJson} relatedPosts={relatedPosts} />
          </div>
        </article>
      </div>
    </main>
  );
}

function ArticleToc({ title, headings, compact = false }: { title: string; headings: BlogHeading[]; compact?: boolean }) {
  if (!headings.length) return null;
  return (
    <nav aria-label={title || "Table of contents"} className={compact ? "mt-3" : ""}>
      {title && <p className="text-base font-black text-blue-700">{title}</p>}
      <ol className={`${compact ? "mt-3" : "mt-4 border-l border-blue-100 pl-4"} space-y-2 text-[13px] leading-5`}>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-4" : ""}>
            <a href={`#${heading.id}`} title={heading.text} className={`block truncate font-medium hover:text-blue-700 hover:underline ${heading.level === 3 ? "text-navy-500" : "text-navy-800"}`}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
