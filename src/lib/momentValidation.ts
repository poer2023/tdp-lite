export function isMomentPublishable(content: string, mediaCount: number): boolean {
  return content.trim().length > 0 || mediaCount > 0;
}
