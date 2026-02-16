/**
 * Generate a URL-friendly slug from title.
 * Supports English letters, numbers, and Chinese characters.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
