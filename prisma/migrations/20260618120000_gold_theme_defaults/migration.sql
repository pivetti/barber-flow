ALTER TABLE "SiteSettings"
ALTER COLUMN "primaryColor" SET DEFAULT '#C7A15A',
ALTER COLUMN "secondaryColor" SET DEFAULT '#D8B56C',
ALTER COLUMN "accentColor" SET DEFAULT '#E7C979',
ALTER COLUMN "backgroundGradientColor" SET DEFAULT '#C7A15A';

UPDATE "SiteSettings"
SET
  "primaryColor" = CASE WHEN UPPER("primaryColor") = '#111184' THEN '#C7A15A' ELSE "primaryColor" END,
  "secondaryColor" = CASE WHEN UPPER("secondaryColor") = '#1B1BA3' THEN '#D8B56C' ELSE "secondaryColor" END,
  "accentColor" = CASE WHEN UPPER("accentColor") = '#C7CBFF' THEN '#E7C979' ELSE "accentColor" END,
  "backgroundGradientColor" = CASE WHEN UPPER("backgroundGradientColor") = '#111184' THEN '#C7A15A' ELSE "backgroundGradientColor" END;
