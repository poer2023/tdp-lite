ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS card_span text;

ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS card_span text;
