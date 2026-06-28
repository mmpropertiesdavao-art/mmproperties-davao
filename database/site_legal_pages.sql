CREATE TABLE IF NOT EXISTS site_pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_pages (slug, title, content)
VALUES
  (
    'privacy-policy',
    'Privacy Policy',
    'MM Properties respects your privacy. This page explains how we collect and use information submitted through inquiries, account forms, saved listings, and property search activity. Please update this policy with your final legal language before launch.'
  ),
  (
    'terms-of-service',
    'Terms of Service',
    'Welcome to MM Properties. By using this website, visitors agree that property information is provided for general guidance and should be verified before any purchase, sale, lease, or investment decision. Please update these terms with your final legal language before launch.'
  )
ON CONFLICT (slug) DO NOTHING;
