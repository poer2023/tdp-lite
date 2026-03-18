UPDATE moments
SET created_at = published_at
WHERE deleted_at IS NULL
  AND published_at IS NOT NULL
  AND created_at > published_at + interval '1 day';

UPDATE posts
SET created_at = published_at
WHERE deleted_at IS NULL
  AND published_at IS NOT NULL
  AND created_at > published_at + interval '1 day';

UPDATE posts
SET locale = 'zh'
WHERE deleted_at IS NULL
  AND locale = 'en'
  AND slug = '测试博客-1'
  AND title = '测试博客 1';
