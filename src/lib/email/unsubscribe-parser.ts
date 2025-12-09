/**
 * Extract unsubscribe URL from HTML content
 * Searches for <a> tags containing unsubscribe-related keywords
 */

// Keywords to match (case-insensitive)
const UNSUBSCRIBE_KEYWORDS = [
  // English
  "unsubscribe",
  "opt-out",
  "opt out",
  "stop receiving",
  "manage preferences",
  "email preferences",
  "update preferences",
  "subscription preferences",
  // Traditional Chinese
  "取消訂閱",
  "退訂",
  // Simplified Chinese
  "取消订阅",
  // Japanese
  "配信停止",
  "購読解除",
];

/**
 * Extract unsubscribe URL from HTML email content
 * Prioritizes http/https URLs over mailto links
 */
export function extractUnsubscribeUrlFromHtml(html: string): string | undefined {
  if (!html) return undefined;

  // Regex to match <a> tags with href attribute
  // Captures: href value and tag content (including nested HTML)
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const httpMatches: string[] = [];
  const mailtoMatches: string[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const content = match[2];

    // Strip HTML tags from content for text matching
    const textContent = content.replace(/<[^>]*>/g, "").toLowerCase();
    const hrefLower = href.toLowerCase();

    // Check if content or href contains any unsubscribe keyword
    const hasKeyword = UNSUBSCRIBE_KEYWORDS.some(
      (keyword) =>
        textContent.includes(keyword.toLowerCase()) || hrefLower.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        httpMatches.push(href);
      } else if (href.startsWith("mailto:")) {
        mailtoMatches.push(href);
      }
    }
  }

  // Prefer http/https URLs over mailto
  if (httpMatches.length > 0) {
    return httpMatches[0];
  }

  if (mailtoMatches.length > 0) {
    return mailtoMatches[0];
  }

  return undefined;
}
