export interface ParsedAlbum {
  artist: string;
  album: string;
  lineNumber?: number;
}

/**
 * Parse OCR text to extract album and artist information
 * Supports formats like:
 * - Artist - Album
 * - Artist / Album
 * - Number. Artist - Album
 * - Artist: Album
 */
export function parseAlbumsFromText(text: string): ParsedAlbum[] {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  const albums: ParsedAlbum[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseAlbumLine(line);

    if (parsed) {
      albums.push({
        ...parsed,
        lineNumber: i + 1,
      });
    }
  }

  return albums;
}

/**
 * Parse a single line to extract artist and album
 * Uses the FIRST occurrence of delimiter to split: Artist - Album Name - With Subtitle
 * becomes artist="Artist", album="Album Name - With Subtitle"
 */
function parseAlbumLine(line: string): Omit<ParsedAlbum, 'lineNumber'> | null {
  // Remove leading numbers (e.g., "1. Artist - Album" -> "Artist - Album")
  let cleanLine = line.replace(/^\d+[\.\)]\s*/, '');

  // Try different delimiters in order of priority (with spaces first, then without)
  const delimiters = [' - ', ' – ', ' — ', '-', '–', '—', ': ', ' / ', ' | '];

  for (const delimiter of delimiters) {
    const delimiterIndex = cleanLine.indexOf(delimiter);
    if (delimiterIndex > 0) {
      const artist = cleanLine.substring(0, delimiterIndex).trim();
      const album = cleanLine.substring(delimiterIndex + delimiter.length).trim();

      // Validate that both artist and album have reasonable length
      if (artist.length > 0 && artist.length < 100 && album.length > 0 && album.length < 200) {
        return { artist, album };
      }
    }
  }

  return null;
}

/**
 * Clean and normalize artist/album names
 */
export function cleanAlbumInfo(parsed: ParsedAlbum): ParsedAlbum {
  return {
    artist: cleanText(parsed.artist),
    album: cleanText(parsed.album),
    lineNumber: parsed.lineNumber,
  };
}

/**
 * Remove common OCR artifacts and extra whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/…/g, '...') // Normalize ellipsis
    .replace(/[^\S\r\n]+/g, ' ') // Remove extra spaces
    .trim();
}

/**
 * Deduplicate albums based on artist and album name similarity
 */
export function deduplicateAlbums(albums: ParsedAlbum[]): ParsedAlbum[] {
  const seen = new Set<string>();
  const unique: ParsedAlbum[] = [];

  for (const album of albums) {
    const key = normalizeForComparison(album.artist + album.album);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(album);
    }
  }

  return unique;
}

/**
 * Normalize text for comparison (lowercase, remove special chars)
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Filter out invalid or noise entries
 */
export function filterValidAlbums(albums: ParsedAlbum[]): ParsedAlbum[] {
  return albums.filter((album) => {
    // Remove entries that are too short
    if (album.artist.length < 2 || album.album.length < 2) {
      return false;
    }

    // Remove entries that are likely OCR noise
    const combined = album.artist + ' ' + album.album;
    const hasEnoughLetters = (combined.match(/[a-zA-Z]/g) || []).length >= 5;
    const notTooManySpecialChars = (combined.match(/[^a-zA-Z0-9\s\-'/]/g) || []).length < combined.length * 0.3;

    return hasEnoughLetters && notTooManySpecialChars;
  });
}
