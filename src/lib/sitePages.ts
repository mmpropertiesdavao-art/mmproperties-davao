import { db } from "@/lib/supabase/server";

export type SitePage = {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
};

const FALLBACKS: Record<string, SitePage> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content:
      "MM Properties respects your privacy. This page explains how we collect and use information submitted through inquiries, account forms, saved listings, and property search activity. Please update this policy with your final legal language before launch.",
    updatedAt: null,
  },
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service",
    content:
      "Welcome to MM Properties. By using this website, visitors agree that property information is provided for general guidance and should be verified before any purchase, sale, lease, or investment decision. Please update these terms with your final legal language before launch.",
    updatedAt: null,
  },
};

async function tableExists() {
  const { rows } = await db.query<{ exists: boolean }>({
    text: `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'site_pages'
      ) AS "exists"
    `,
  });

  return rows[0]?.exists === true;
}

export async function getSitePage(slug: string) {
  const fallback = FALLBACKS[slug];
  if (!fallback) return null;

  try {
    if (!(await tableExists())) return fallback;

    const { rows } = await db.query<SitePage>({
      text: `
        SELECT slug,title,content,updated_at AS "updatedAt"
        FROM site_pages
        WHERE slug = $1
        LIMIT 1
      `,
      values: [slug],
    });

    return rows[0] || fallback;
  } catch {
    return fallback;
  }
}

export async function getEditableSitePages() {
  return Promise.all([getSitePage("privacy-policy"), getSitePage("terms-of-service")]).then((pages) =>
    pages.filter(Boolean) as SitePage[],
  );
}
