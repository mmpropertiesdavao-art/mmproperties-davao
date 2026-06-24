import { notFound } from "next/navigation";
import { BLOG_CATEGORY_LABELS, getPublishedPost } from "@/lib/blog";
import { BlogBlocks } from "@/lib/blog-blocks";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) { const post=await getPublishedPost((await params).slug); return post?{title:post.seoTitle||post.title,description:post.metaDescription||post.excerpt,openGraph:{images:post.coverImageUrl?[post.coverImageUrl]:[]}}:{}; }

export const dynamic = "force-dynamic";

export default async function GuidePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">{BLOG_CATEGORY_LABELS[post.category] ?? post.category}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-navy-900">{post.title}</h1>
      <p className="mt-3 text-sm text-navy-400">Published {new Date(post.publishedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
      {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-8 max-h-[440px] w-full rounded-xl object-cover" />}
      <div className="mt-8"><BlogBlocks blocks={post.contentJson}/></div>
    </article>
  );
}
