"use client";

import { useMemo, useState } from "react";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  featuredPosition: number | null;
  updatedAt?: string | null;
};

export function BlogPostTable<T extends Post>({ posts, onEdit }: { posts: T[]; onEdit: (post: T) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(
    () =>
      posts
        .filter((post) => `${post.title} ${post.category}`.toLowerCase().includes(query.toLowerCase().trim()))
        .sort((a, b) => {
          if (sort === "oldest") return +new Date(a.updatedAt || a.publishedAt || 0) - +new Date(b.updatedAt || b.publishedAt || 0);
          if (sort === "title") return a.title.localeCompare(b.title);
          if (sort === "category") return a.category.localeCompare(b.category);
          if (sort === "status") return status(a).localeCompare(status(b));
          if (sort === "featured") return (a.featuredPosition || 99) - (b.featuredPosition || 99);
          return +new Date(b.updatedAt || b.publishedAt || 0) - +new Date(a.updatedAt || a.publishedAt || 0);
        }),
    [posts, query, sort],
  );

  return (
    <section className="mt-7">
      <div className="mb-3 grid gap-3 sm:flex sm:flex-wrap">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search blog title or category"
          className="w-full min-w-0 flex-1 rounded-md border border-navy-200 px-3 py-2 text-sm sm:min-w-64"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="w-full rounded-md border border-navy-200 px-3 py-2 text-sm sm:w-auto"
        >
          <option value="newest">Recently updated</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title A-Z</option>
          <option value="category">Category</option>
          <option value="status">Status</option>
          <option value="featured">Featured position</option>
        </select>
      </div>

      <div className="responsive-card-table overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase text-navy-500">
            <tr>
              <th className="p-3">Post</th>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Featured</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id} className="border-t border-navy-100 hover:bg-navy-50/60">
                <td data-label="Post" className="p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="admin-thumbnail-frame h-12 w-16 shrink-0 overflow-hidden rounded-md bg-navy-50">
                      <img src={post.coverImageUrl || "/placeholder-property.png"} alt="" className="admin-thumbnail-image h-full w-full object-cover" />
                    </div>
                    <p className="max-w-lg truncate font-semibold text-navy-900">{post.title}</p>
                  </div>
                </td>
                <td data-label="Category" className="p-3 capitalize">{post.category.replace(/_/g, " ")}</td>
                <td data-label="Status" className="p-3">{status(post)}</td>
                <td data-label="Featured" className="p-3">{post.featuredPosition ? `Position ${post.featuredPosition}` : "-"}</td>
                <td data-label="Action" className="p-3 text-right">
                  <button type="button" onClick={() => onEdit(post)} className="font-semibold text-gold-700 underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-8 text-center text-navy-400">No matching blog posts.</p>}
      </div>
    </section>
  );
}

function status(post: Post) {
  if (!post.publishedAt) return "Draft";
  return new Date(post.publishedAt) > new Date() ? "Scheduled" : "Published";
}
