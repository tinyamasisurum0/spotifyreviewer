/** Extract Spotify playlist ID from a URL or return null. Safe for client-side use. */
export function extractPlaylistIdFromUrl(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
