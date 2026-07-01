import { notFound } from "next/navigation";
import { BLOG_CATEGORY_LABELS, getPublishedPost, getPublishedPosts } from "@/lib/blog";
import { BlogBlocks, getFaqBlocks } from "@/lib/blog-blocks";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const post=await getPublishedPost((await params).slug);
  return post?{
    title:post.seoTitle||post.title,
    description:post.metaDescription||post.excerpt,
    alternates:{canonical:`https://mmpropertiesdavao.com/guides/${post.slug}`},
    openGraph:{title:post.seoTitle||post.title,description:post.metaDescription||post.excerpt||undefined,url:`https://mmpropertiesdavao.com/guides/${post.slug}`,type:"article",images:post.coverImageUrl?[post.coverImageUrl]:[]},
    twitter:{card:"summary_large_image",title:post.seoTitle||post.title,description:post.metaDescription||post.excerpt||undefined,images:post.coverImageUrl?[post.coverImageUrl]:[]}
  }:{};
}

export const dynamic = "force-dynamic";

export default async function GuidePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const relatedPosts = (await getPublishedPosts()).filter((item) => item.id !== post.id);
  const faqs = getFaqBlocks(post.contentJson);
  const faqJsonLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.text,
      acceptedAnswer: { "@type": "Answer", text: faq.caption },
    })),
  } : null;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || post.content.slice(0, 155),
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Organization", name: "MM Properties Davao" },
    publisher: { "@type": "Organization", name: "MM Properties Davao", logo: { "@type": "ImageObject", url: "https://mmpropertiesdavao.com/mm-favicon.png" } },
    mainEntityOfPage: `https://mmpropertiesdavao.com/guides/${post.slug}`,
  };
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">{BLOG_CATEGORY_LABELS[post.category] ?? post.category}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-navy-900">{post.title}</h1>
      <p className="mt-3 text-sm text-navy-400">Published {new Date(post.publishedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} · Written by MM Properties Davao Editorial Team</p>
      <p className="mt-3 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm leading-6 text-navy-600">This guide is educational and maintained for Davao property buyers, sellers, and investors. For decisions specific to your situation, consult a licensed attorney, accountant, broker, or financing professional.</p>
      {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-8 max-h-[440px] w-full rounded-xl object-cover" />}
      <div className="mt-8"><BlogBlocks blocks={post.contentJson} relatedPosts={relatedPosts}/></div>
    </article>
  );
}
