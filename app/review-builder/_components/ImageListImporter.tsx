'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, FileImage, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { processImageWithOCR, preprocessImage, handleImagePaste, OCRProgress } from '@/utils/ocrProcessor';
import { parseAlbumsFromText, cleanAlbumInfo, deduplicateAlbums, filterValidAlbums, ParsedAlbum } from '@/utils/albumParser';

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  label?: string | null;
  external_urls?: { spotify?: string };
}

interface MatchedAlbum extends ParsedAlbum {
  spotifyData?: SpotifyAlbum;
  matched: boolean;
  searching?: boolean;
}

interface ImageListImporterProps {
  onImportComplete: (albums: SpotifyAlbum[]) => void;
}

export default function ImageListImporter({ onImportComplete }: ImageListImporterProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [parsedAlbums, setParsedAlbums] = useState<MatchedAlbum[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [focusRightColumn, setFocusRightColumn] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setShowResults(false);
      setParsedAlbums([]);
      setExtractedText('');

      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const file = await handleImagePaste(event);
    if (file) {
      setSelectedImage(file);
      setShowResults(false);
      setParsedAlbums([]);
      setExtractedText('');

      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setOcrProgress(null);
    setShowResults(false);

    try {
      const preprocessed = await preprocessImage(selectedImage, focusRightColumn);
      const result = await processImageWithOCR(preprocessed, (progress) => {
        setOcrProgress(progress);
      });

      setExtractedText(result.text);

      let albums = parseAlbumsFromText(result.text);
      albums = albums.map(cleanAlbumInfo);
      albums = filterValidAlbums(albums);
      albums = deduplicateAlbums(albums);

      const matchedAlbums: MatchedAlbum[] = albums.map((album) => ({
        ...album,
        matched: false,
        searching: false,
      }));

      setParsedAlbums(matchedAlbums);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try a different image or check the console for details.');
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  };

  // Helper: normalize text for comparison
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper: check if two strings are similar enough
  const isSimilar = (str1: string, str2: string): boolean => {
    const norm1 = normalizeText(str1);
    const norm2 = normalizeText(str2);

    // Exact match after normalization
    if (norm1 === norm2) return true;

    // One contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    // Check word overlap (at least 50% of words match)
    const words1 = norm1.split(' ').filter(w => w.length > 2);
    const words2 = norm2.split(' ').filter(w => w.length > 2);
    if (words1.length === 0 || words2.length === 0) return false;

    const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    return matchingWords.length >= Math.min(words1.length, words2.length) * 0.5;
  };

  // Helper: clean query for Spotify search
  const cleanSearchQuery = (text: string): string => {
    return text
      .replace(/[?!.,;:'"()[\]{}]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ')
      .trim();
  };

  const searchSpotifyAlbum = async (album: MatchedAlbum): Promise<SpotifyAlbum | null> => {
    try {
      const cleanArtist = cleanSearchQuery(album.artist);
      const cleanAlbum = cleanSearchQuery(album.album);

      // Search strategies in order of preference
      const searchStrategies = [
        `artist:${cleanArtist} album:${cleanAlbum}`,
        `${cleanArtist} ${cleanAlbum}`,
        `artist:${cleanArtist} ${cleanAlbum}`,
        `${cleanAlbum} ${cleanArtist}`,
      ];

      for (const query of searchStrategies) {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=5`);

        if (!response.ok) continue;

        const data = await response.json();
        const results = data.albums || [];

        // Find best matching result
        for (const result of results) {
          const resultArtist = Array.isArray(result.artists) ? result.artists.join(' ') : '';
          const resultAlbum = result.name || '';

          // Verify the result actually matches what we searched for
          const artistMatches = isSimilar(album.artist, resultArtist);
          const albumMatches = isSimilar(album.album, resultAlbum);

          if (artistMatches && albumMatches) {
            console.log(`✓ Found match for "${album.artist} - ${album.album}":`, result.name, 'by', resultArtist);

            return {
              id: result.id,
              name: result.name,
              artists: Array.isArray(result.artists)
                ? result.artists.map((name: string) => ({ name }))
                : [{ name: 'Unknown Artist' }],
              images: result.image ? [{ url: result.image }] : [],
              release_date: result.releaseDate || '',
              label: null,
              external_urls: result.spotifyUrl ? { spotify: result.spotifyUrl } : undefined,
            };
          }
        }
      }

      console.log(`✗ No matching result for: ${album.artist} - ${album.album}`);
      return null;
    } catch (error) {
      console.error(`Failed to search for ${album.artist} - ${album.album}:`, error);
      return null;
    }
  };

  const handleSearchAllAlbums = async () => {
    setIsSearching(true);

    const updatedAlbums = [...parsedAlbums];

    for (let i = 0; i < updatedAlbums.length; i++) {
      updatedAlbums[i].searching = true;
      setParsedAlbums([...updatedAlbums]);

      const spotifyData = await searchSpotifyAlbum(updatedAlbums[i]);

      updatedAlbums[i].searching = false;
      updatedAlbums[i].matched = spotifyData !== null;
      updatedAlbums[i].spotifyData = spotifyData || undefined;

      setParsedAlbums([...updatedAlbums]);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsSearching(false);
  };

  const handleManualSearch = async (index: number) => {
    const updatedAlbums = [...parsedAlbums];
    updatedAlbums[index].searching = true;
    setParsedAlbums(updatedAlbums);

    const spotifyData = await searchSpotifyAlbum(updatedAlbums[index]);

    updatedAlbums[index].searching = false;
    updatedAlbums[index].matched = spotifyData !== null;
    updatedAlbums[index].spotifyData = spotifyData || undefined;

    setParsedAlbums(updatedAlbums);
  };

  const handleRemoveAlbum = (index: number) => {
    setParsedAlbums((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditAlbum = (index: number, field: 'artist' | 'album', value: string) => {
    setParsedAlbums((prev) =>
      prev.map((album, i) =>
        i === index ? { ...album, [field]: value, matched: false, spotifyData: undefined } : album
      )
    );
  };

  const handleImportMatched = () => {
    const matchedAlbums = parsedAlbums
      .filter((album) => album.matched && album.spotifyData)
      .map((album) => album.spotifyData!);

    if (matchedAlbums.length === 0) {
      alert('No matched albums to import. Please search for albums first.');
      return;
    }

    onImportComplete(matchedAlbums);
  };

  const matchedCount = parsedAlbums.filter((a) => a.matched).length;
  const unmatchedCount = parsedAlbums.length - matchedCount;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-800/70 bg-gray-950/70 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Import Albums from Image</h2>
        <p className="mb-6 text-sm text-gray-400">
          Upload or paste an image containing a list of albums with artist names. The system will extract the text and
          search for albums on Spotify.
        </p>

        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={focusRightColumn}
              onChange={(e) => setFocusRightColumn(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-400"
            />
            <span>Focus on right column (recommended for AOTY-style grids)</span>
          </label>
          <p className="ml-6 mt-1 text-xs text-gray-500">
            Enable this to only read text from the right side of the image, ignoring album covers
          </p>
        </div>

        <div className="space-y-4">
          <div
            ref={pasteAreaRef}
            tabIndex={0}
            onPaste={(e) => handlePaste(e.nativeEvent)}
            className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-8 transition hover:border-emerald-500 hover:bg-gray-900/70"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="relative h-48 w-full">
                <Image src={imagePreview} alt="Selected image" fill className="rounded-lg object-contain" />
              </div>
            ) : (
              <>
                <FileImage className="mb-4 h-12 w-12 text-gray-600" />
                <p className="mb-2 text-center text-base font-medium text-gray-300">
                  Click to upload or paste an image
                </p>
                <p className="text-center text-sm text-gray-500">Supports JPG, PNG, WebP (max 5MB)</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedImage && (
            <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 p-3">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-300">{selectedImage.name}</span>
              </div>
              <button
                onClick={handleProcessImage}
                disabled={isProcessing}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Extract Text'
                )}
              </button>
            </div>
          )}

          {ocrProgress && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4">
              <p className="mb-2 text-sm text-gray-300">{ocrProgress.status}</p>
              <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${ocrProgress.progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showResults && parsedAlbums.length > 0 && (
        <div className="rounded-2xl border border-gray-800/70 bg-gray-950/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Extracted Albums ({parsedAlbums.length})
            </h3>
            <div className="flex gap-3">
              <button
                onClick={handleSearchAllAlbums}
                disabled={isSearching}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </span>
                ) : (
                  'Search All on Spotify'
                )}
              </button>
              {matchedCount > 0 && (
                <button
                  onClick={handleImportMatched}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Import {matchedCount} Matched Albums
                </button>
              )}
            </div>
          </div>

          {matchedCount > 0 && (
            <div className="mb-4 flex gap-4 text-sm">
              <span className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {matchedCount} matched
              </span>
              {unmatchedCount > 0 && (
                <span className="flex items-center gap-2 text-yellow-400">
                  <XCircle className="h-4 w-4" />
                  {unmatchedCount} unmatched
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {parsedAlbums.map((album, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  album.matched
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-gray-800 bg-gray-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    {album.spotifyData && album.spotifyData.images && album.spotifyData.images.length > 0 && album.spotifyData.images[0]?.url && (
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
                        <Image
                          src={album.spotifyData.images[0].url}
                          alt={album.spotifyData.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      {album.matched && album.spotifyData ? (
                        <>
                          <p className="text-sm font-medium text-white">
                            {album.spotifyData.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {album.spotifyData.artists?.[0]?.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Album</label>
                            <input
                              type="text"
                              value={album.album}
                              onChange={(e) => handleEditAlbum(index, 'album', e.target.value)}
                              className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white transition focus:border-emerald-500 focus:outline-none"
                              placeholder="Album name"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Artist</label>
                            <input
                              type="text"
                              value={album.artist}
                              onChange={(e) => handleEditAlbum(index, 'artist', e.target.value)}
                              className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white transition focus:border-emerald-500 focus:outline-none"
                              placeholder="Artist name"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {album.matched ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : album.searching ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    ) : (
                      <button
                        onClick={() => handleManualSearch(index)}
                        className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-300 transition hover:bg-gray-600"
                        title="Search on Spotify"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveAlbum(index)}
                      className="rounded bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && parsedAlbums.length === 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6">
          <p className="text-sm text-yellow-200">
            No albums found in the image. Please try a clearer image with visible artist and album names.
          </p>
        </div>
      )}

      {extractedText && (
        <details className="rounded-2xl border border-gray-800/70 bg-gray-950/70 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-400">
            View Extracted Text ({extractedText.length} characters)
          </summary>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-900 p-3 text-xs text-gray-300">
            {extractedText}
          </pre>
        </details>
      )}
    </div>
  );
}
