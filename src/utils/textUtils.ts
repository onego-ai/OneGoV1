
/**
 * Decodes HTML entities in text to make it suitable for text-to-speech
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  
  // Create a temporary div element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Manual fallbacks for common entities in case the above doesn't catch them
  decoded = decoded
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\[email&#160;protected\]/g, '[email protected]')
    .replace(/\[email\s*protected\]/g, '[email protected]');
  
  return decoded;
};

/**
 * Sanitizes text for text-to-speech by removing problematic characters and formatting
 */
export const sanitizeForTTS = (text: string): string => {
  if (!text) return text;
  
  let sanitized = decodeHtmlEntities(text);
  
  // Remove or replace other TTS-problematic content
  sanitized = sanitized
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u00A0\u2000-\u200B\u2028\u2029]/g, ' ') // Replace non-breaking spaces and other unicode spaces
    .trim();
  
  return sanitized;
};
