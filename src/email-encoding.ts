/**
 * Utility functions for encoding/decoding emails in URLs for anonymity
 */

export function encodeEmail(email: string): string {
  return btoa(email);
}

export function decodeEmail(encodedEmail: string): string {
  try {
    return atob(encodedEmail);
  } catch (error) {
    console.error("Failed to decode email:", error);
    return "";
  }
}
