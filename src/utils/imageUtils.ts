/**
 * Resolves an external image URL through PML's backend image proxy if needed,
 * avoiding 403 Forbidden hotlink blocks from sources like Wikimedia Commons, Wikipedia, etc.
 */
export function getProxiedImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Already local, proxied, or data URI
  if (trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Pollinations AI generated images can be loaded directly
  if (trimmed.includes('image.pollinations.ai')) {
    return trimmed;
  }

  // For Wikimedia, Wikipedia, and external web photos that enforce strict referer checks:
  if (
    trimmed.includes('wikimedia.org') ||
    trimmed.includes('wikipedia.org') ||
    trimmed.includes('wikivoyage.org') ||
    trimmed.includes('wiktionary.org') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return `/api/images/proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
