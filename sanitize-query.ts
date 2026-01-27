/**
 * Query Sanitization
 *
 * Strips channel metadata, timestamps, and other artifacts from queries
 * before sending to Supermemory for search. This improves search quality
 * by focusing on the actual user intent rather than routing metadata.
 *
 * Uses Clawdbot's stripEnvelope utility when available, with regex fallback
 * for backwards compatibility with older Clawdbot versions.
 */

// Lazy-loaded stripEnvelope implementation
let stripEnvelopeImpl: ((text: string) => string) | null | undefined = undefined;

/**
 * Get the stripEnvelope implementation (lazy load on first use).
 * Returns null if not available, caches the result.
 */
function getStripEnvelope(): ((text: string) => string) | null {
  if (stripEnvelopeImpl !== undefined) {
    return stripEnvelopeImpl;
  }

  try {
    // Use require for synchronous loading (works with jiti)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("clawdbot/plugin-sdk");
    if (typeof sdk.stripEnvelope === "function") {
      stripEnvelopeImpl = sdk.stripEnvelope;
      return stripEnvelopeImpl;
    }
  } catch {
    // Clawdbot not available or stripEnvelope not exported - use fallback
  }

  stripEnvelopeImpl = null;
  return null;
}

/**
 * Fallback channel metadata prefix pattern.
 * Used when Clawdbot's stripEnvelope is not available.
 * Matches patterns like:
 * - [Telegram Chad Boyd (@cboyd76) id:7820917448 +2m 2026-01-27 04:03 UTC]
 * - [Discord username#1234 id:123456789 2026-01-27 04:03 UTC]
 */
const CHANNEL_METADATA_PATTERN =
  /^\s*\[(?:Telegram|Discord|Slack|Signal|WhatsApp|iMessage|SMS|Matrix|Teams|Zalo|Web|WebChat|Google Chat|BlueBubbles|Zalo Personal)[^\]]*\]\s*/i;

/**
 * Standalone timestamp patterns that may appear in messages.
 * Matches ISO 8601 dates, Unix timestamps, and common date formats.
 */
const TIMESTAMP_PATTERNS = [
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s*(?:UTC)?/g,
  /\b\d{10,13}\b/g, // Unix timestamps (seconds or milliseconds)
  /\+\d+[smhd]\b/g, // Relative time like +2m, +1h
];

/**
 * User ID patterns that may leak into queries.
 */
const USER_ID_PATTERNS = [
  /\bid:\s*\d+\b/gi,
  /\buser_?id:\s*["']?[\w-]+["']?\b/gi,
  /\bchat_?id:\s*\d+\b/gi,
];

/**
 * JSON artifact patterns - partial or malformed JSON that may appear.
 */
const JSON_ARTIFACT_PATTERNS = [
  /\{[^{}]*"(?:id|user|chat|message)"[^{}]*\}/g,
  /\[\s*\{[^[\]]*\}\s*\]/g, // Small JSON arrays
];

/**
 * Strip the channel envelope prefix from text.
 * Uses Clawdbot's stripEnvelope if available, otherwise falls back to regex.
 */
function stripChannelEnvelope(text: string): string {
  const impl = getStripEnvelope();
  if (impl) {
    return impl(text);
  }
  // Fallback regex for older Clawdbot versions
  return text.replace(CHANNEL_METADATA_PATTERN, "");
}

/**
 * Sanitize a query string for Supermemory search.
 *
 * Removes channel metadata, timestamps, user IDs, and JSON artifacts
 * to extract the core user query/intent.
 *
 * @param query - Raw query string that may contain metadata
 * @returns Sanitized query with metadata stripped
 */
export function sanitizeQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  let sanitized = query;

  // Strip channel metadata prefix (most important)
  sanitized = stripChannelEnvelope(sanitized);

  // Remove standalone timestamps
  for (const pattern of TIMESTAMP_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  // Remove user ID patterns
  for (const pattern of USER_ID_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  // Remove JSON artifacts
  for (const pattern of JSON_ARTIFACT_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  // Collapse multiple whitespace and trim
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * Check if a query needs sanitization.
 * Useful for logging/debugging to see if sanitization had an effect.
 */
export function needsSanitization(query: string): boolean {
  if (!query || typeof query !== "string") {
    return false;
  }

  if (CHANNEL_METADATA_PATTERN.test(query)) {
    return true;
  }

  for (const pattern of TIMESTAMP_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(query)) {
      return true;
    }
  }

  for (const pattern of USER_ID_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(query)) {
      return true;
    }
  }

  for (const pattern of JSON_ARTIFACT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(query)) {
      return true;
    }
  }

  return false;
}
