-- ============================================================
-- Davao Property Finder — seed data
-- ============================================================
-- Illustrative starter data: developers, named landmarks, and the
-- 10 launch neighborhoods. Coordinates are approximate centroids for
-- each area, suitable for map demos — replace with surveyed boundaries
-- before relying on this for real geospatial accuracy. Price/advantage
-- text is clearly placeholder copy, not verified market data.

-- ---------------- Property types ----------------
INSERT INTO property_types (slug, label) VALUES
  ('house-and-lot', 'House and Lot'),
  ('condominium', 'Condominium'),
  ('lot-only', 'Lot Only'),
  ('commercial', 'Commercial Property'),
  ('townhouse', 'Townhouse'),
  ('foreclosed', 'Foreclosed Property');

-- ---------------- Developers ----------------
INSERT INTO developers (name, founded_year) VALUES
  ('Vista Land', 1977),
  ('Filinvest', 1955),
  ('Sta. Lucia Land', 1965),
  ('Avida Land', 2003),
  ('Camella', 1977),
  ('DMCI Homes', 1999);

-- ---------------- Named landmarks (for distance-to features) ----------------
INSERT INTO malls (name, location) VALUES
  ('SM Lanang Premier', ST_MakePoint(125.6398, 7.1019)::geography),
  ('Abreeza Mall', ST_MakePoint(125.6112, 7.0856)::geography);

INSERT INTO hospitals (name, location) VALUES
  ('Davao Doctors Hospital', ST_MakePoint(125.6097, 7.0728)::geography);

INSERT INTO schools (name, type, location) VALUES
  ('Ateneo de Davao University', 'university', ST_MakePoint(125.6118, 7.0739)::geography);

INSERT INTO landmarks (name, category, location) VALUES
  ('Davao International Airport', 'airport', ST_MakePoint(125.6458, 7.1255)::geography);

-- ---------------- Neighborhoods (10 launch SEO pages) ----------------
-- avg_price_per_sqm and advantages/disadvantages are illustrative placeholders.
INSERT INTO neighborhoods (name, slug, barangay, overview, avg_price_per_sqm, advantages, disadvantages, centroid) VALUES
  ('Lanang', 'lanang', 'Lanang',
   'A commercial and residential hub on Davao''s east side, anchored by SM Lanang Premier. Popular with families who want mall, school, and highway access in one area.',
   65000,
   ARRAY['Close to SM Lanang Premier and the coastal road', 'Strong rental demand from nearby offices', 'Well-served by public transport'],
   ARRAY['Traffic congestion during peak hours', 'Premium pricing relative to outlying areas'],
   ST_MakePoint(125.6380, 7.1010)::geography),

  ('Buhangin', 'buhangin', 'Buhangin',
   'A fast-growing residential district near the airport, with a mix of subdivisions and emerging condo developments.',
   48000,
   ARRAY['Proximity to Davao International Airport', 'More affordable than coastal districts', 'Active new subdivision development'],
   ARRAY['Flight-path noise in some pockets', 'Some roads still under development'],
   ST_MakePoint(125.6280, 7.1190)::geography),

  ('Matina', 'matina', 'Matina',
   'An established, centrally located district favored by families for its schools and long-standing residential subdivisions.',
   55000,
   ARRAY['Mature neighborhood with established schools', 'Central location, short commute to downtown', 'Wide range of housing price points'],
   ARRAY['Older infrastructure in some subdivisions', 'Limited new-build inventory'],
   ST_MakePoint(125.5950, 7.0560)::geography),

  ('Maa', 'maa', 'Maa',
   'A quieter residential area west of downtown, popular with first-time buyers seeking value.',
   42000,
   ARRAY['More affordable entry price point', 'Growing retail and dining options', 'Reasonable distance to downtown'],
   ARRAY['Fewer high-end amenities nearby', 'Public transport less frequent than coastal areas'],
   ST_MakePoint(125.5780, 7.0780)::geography),

  ('Bajada', 'bajada', 'Bajada',
   'A dense, centrally located commercial-residential mix near downtown Davao, ideal for buyers prioritizing walkability.',
   70000,
   ARRAY['Walking distance to downtown amenities', 'Strong condo and commercial rental demand', 'Excellent transport links'],
   ARRAY['Limited house-and-lot inventory', 'Higher density and street noise'],
   ST_MakePoint(125.6080, 7.0950)::geography),

  ('Ecoland', 'ecoland', 'Ecoland',
   'A planned, business-district-adjacent area popular with young professionals and condo investors.',
   60000,
   ARRAY['Close to BPO offices and SM City Davao', 'Newer condo and townhouse developments', 'Good road network'],
   ARRAY['Can be pricier than comparable inland areas', 'Limited lot-only inventory'],
   ST_MakePoint(125.6010, 7.0500)::geography),

  ('Talomo', 'talomo', 'Talomo',
   'A large, diverse district spanning urban and semi-rural pockets, offering some of the city''s broadest price range.',
   38000,
   ARRAY['Wide range of lot sizes and price points', 'Some areas offer larger lots for the budget', 'Expanding subdivision supply'],
   ARRAY['Distance to downtown varies significantly by barangay', 'Infrastructure quality varies block to block'],
   ST_MakePoint(125.5650, 7.0150)::geography),

  ('Toril', 'toril', 'Toril',
   'A southern district known for larger lot sizes and a more provincial feel, popular with buyers wanting space.',
   30000,
   ARRAY['Larger average lot sizes for the price', 'Quieter, less dense than central districts', 'Lower entry price point'],
   ARRAY['Longer commute to downtown and the airport', 'Fewer nearby malls and hospitals'],
   ST_MakePoint(125.5180, 6.9530)::geography),

  ('Catalunan Grande', 'catalunan-grande', 'Catalunan Grande',
   'A established subdivision-heavy area west of the city center, popular with mid-market house-and-lot buyers.',
   45000,
   ARRAY['Established subdivisions with mature amenities', 'Good balance of price and accessibility', 'Active resale market'],
   ARRAY['Distance from coastal malls', 'Limited condo options'],
   ST_MakePoint(125.5550, 7.0480)::geography),

  ('Catalunan Pequeño', 'catalunan-pequeno', 'Catalunan Pequeño',
   'A growing residential area adjacent to Catalunan Grande, with newer developments at accessible price points.',
   40000,
   ARRAY['More affordable than neighboring Catalunan Grande', 'Newer subdivision inventory', 'Room for future appreciation'],
   ARRAY['Still developing supporting infrastructure', 'Fewer established schools nearby'],
   ST_MakePoint(125.5480, 7.0390)::geography);
