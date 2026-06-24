ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured_position INTEGER;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_featured_position_check;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_featured_position_check CHECK (featured_position IS NULL OR featured_position BETWEEN 1 AND 3);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY published_at DESC NULLS LAST, created_at DESC) AS position
  FROM blog_posts WHERE is_featured = true
)
UPDATE blog_posts p SET featured_position = CASE WHEN ranked.position <= 3 THEN ranked.position ELSE NULL END,
  is_featured = ranked.position <= 3
FROM ranked WHERE ranked.id = p.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_featured_position ON blog_posts(featured_position) WHERE featured_position IS NOT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
