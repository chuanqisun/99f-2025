/**
 * Utility functions for generating and working with GUIDs
 */

/**
 * Generate a UUID v4 using the Web Crypto API
 * @returns A UUID v4 string
 */
export function generateGUID(): string {
  // Use crypto.getRandomValues for true randomness
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  // Set version to 4 (random)
  array[6] = (array[6] & 0x0f) | 0x40;

  // Set variant to RFC 4122
  array[8] = (array[8] & 0x3f) | 0x80;

  // Format as UUID string
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
