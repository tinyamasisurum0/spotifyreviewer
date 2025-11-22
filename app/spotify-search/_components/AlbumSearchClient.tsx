'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Search, Sparkles } from 'lucide-react';
import type { SpotifyAlbumSearchResult } from '@/utils/spotifyApi';

const presetQueries = ['Radiohead', 'Beyoncé Renaissance', 'Lana Del Rey', 'Daft Punk Discovery'];

export default function AlbumSearchClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyAlbumSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const headline = useMemo(
    () =>
      results.length
        ? 'Albums that match your search'
        : 'Search Spotify albums and pull artwork instantly',
    [results.length]
  );

  const runSearch = async (value: string) => {
    const term = value.trim();
    if (!term) {
      setError('Type an artist, album, or keyword to search Spotify.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(term)}&limit=12`);
      if (!response.ok) {
        throw new Error('Spotify search failed. Check your API keys and try again.');
      }
      const data = await response.json();
      setResults(Array.isArray(data.albums) ? data.albums : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Unexpected error while searching.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch(query);
  };

  const handlePreset = (term: string) => {
    setQuery(term);
    runSearch(term);
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-gray-950/80 p-6 shadow-xl shadow-emerald-900/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <Sparkles className="h-4 w-4" />
            Live Spotify Lookup
          </p>
          <h1 className="text-3xl font-semibold text-emerald-100 sm:text-4xl">Album search playground</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-300">
            Query Spotify&apos;s catalog, view cover art, release dates, and jump directly to the album on Spotify.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3 text-xs text-gray-300">
          <p className="font-semibold text-emerald-200">Keys</p>
          <p className="mt-1 text-gray-400">
            Uses the same client credentials as playlist analysis. Make sure <code>NEXT_PUBLIC_SPOTIFY_CLIENT_ID</code> and{' '}
            <code>NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET</code> are set.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:flex-row sm:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 'Kind of Blue', 'Tame Impala', or 'Midnight organ fight'"
            className="w-full rounded-xl border border-gray-700/80 bg-gray-950/60 px-10 py-3 text-base text-gray-100 placeholder-gray-500 transition focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 sm:w-auto"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          <span>{loading ? 'Searching…' : 'Search albums'}</span>
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {presetQueries.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handlePreset(item)}
            className="rounded-full border border-gray-700 bg-gray-900/60 px-3 py-1 text-xs text-gray-200 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-sm text-gray-300">
        <p className="font-semibold text-emerald-100">{headline}</p>
        {hasSearched && <p className="text-gray-400">{results.length} result{results.length === 1 ? '' : 's'}</p>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-5 text-sm text-gray-200">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
          <span>Talking to Spotify…</span>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((album) => (
            <article
              key={album.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/70 shadow-lg shadow-black/40 transition hover:-translate-y-1 hover:border-emerald-400/60"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-800 via-gray-900 to-black">
                {album.image ? (
                  <Image
                    src={album.image}
                    alt={album.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    priority={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">No artwork</div>
                )}
              </div>
              <div className="flex flex-col gap-2 p-4">
                <div>
                  <p className="text-lg font-semibold text-emerald-100 line-clamp-2">{album.name}</p>
                  <p className="text-sm text-gray-400 line-clamp-1">
                    {album.artists.length ? album.artists.join(', ') : 'Unknown artist'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'Year unknown'}</span>
                  {album.totalTracks && <span>{album.totalTracks} tracks</span>}
                </div>
                {album.spotifyUrl && (
                  <a
                    href={album.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
                  >
                    Open in Spotify
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-10 text-center text-sm text-gray-300">
          <p className="font-semibold text-emerald-200">No albums found for that search.</p>
          <p className="mt-2 text-gray-400">Try a different keyword or click one of the presets above.</p>
        </div>
      )}
    </div>
  );
}
