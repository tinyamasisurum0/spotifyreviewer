'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Link as LinkIcon, FileImage } from 'lucide-react';
import { extractPlaylistIdFromUrl } from '@/utils/spotifyApi';
import PlaylistAnalyzer, { InputMode } from '@/components/PlaylistAnalyzer';
import { DragDropContext } from 'react-beautiful-dnd';
import type { StoredReview } from '@/types/review';
import ImageListImporter from './ImageListImporter';

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  label?: string | null;
  external_urls?: { spotify?: string };
}

type ImportSource = 'playlist' | 'image';

function InnerReviewBuilder() {
  const searchParams = useSearchParams();
  const initialPlaylistId = searchParams.get('playlistId');
  const reviewId = searchParams.get('reviewId');
  const [playlistUrl, setPlaylistUrl] = useState(() =>
    initialPlaylistId ? `https://open.spotify.com/playlist/${initialPlaylistId}` : ''
  );
  const [playlistId, setPlaylistId] = useState<string | null>(initialPlaylistId);
  const [inputMode, setInputMode] = useState<InputMode>('review');
  const [copiedSampleLink, setCopiedSampleLink] = useState(false);
  const [preloadedReview, setPreloadedReview] = useState<StoredReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>('playlist');
  const [importedAlbums, setImportedAlbums] = useState<SpotifyAlbum[]>([]);
  const samplePlaylistUrl = 'https://open.spotify.com/playlist/0xy8aNki7WxsM42dkTOmER';

  const preloadedInitialData = useMemo(
    () =>
      preloadedReview
        ? {
            playlistId: preloadedReview.playlistId,
            playlistName: preloadedReview.playlistName,
            playlistOwner: preloadedReview.playlistOwner,
            playlistImage: preloadedReview.playlistImage,
            albums: preloadedReview.albums,
          }
        : undefined,
    [preloadedReview]
  );

  useEffect(() => {
    if (initialPlaylistId) {
      setPlaylistId(initialPlaylistId);
      setPlaylistUrl(`https://open.spotify.com/playlist/${initialPlaylistId}`);
    }
  }, [initialPlaylistId]);

  useEffect(() => {
    if (!reviewId) {
      setPreloadedReview(null);
      setPreloadError(null);
      setLoadingReview(false);
      return;
    }

    let isCancelled = false;

    const fetchReview = async () => {
      setLoadingReview(true);
      setPreloadError(null);
      try {
        const response = await fetch(`/api/reviews/${reviewId}`);
        if (!response.ok) {
          throw new Error('Review not found or no longer available.');
        }
        const data: StoredReview = await response.json();
        if (isCancelled) return;
        setPreloadedReview(data);
        setPlaylistId(data.playlistId);
        setPlaylistUrl(`https://open.spotify.com/playlist/${data.playlistId}`);
        setInputMode(data.reviewMode);
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to load saved review', error);
        setPreloadedReview(null);
        setPreloadError('Unable to load the saved review. It may have been removed.');
      } finally {
        if (!isCancelled) {
          setLoadingReview(false);
        }
      }
    };

    fetchReview();

    return () => {
      isCancelled = true;
    };
  }, [reviewId]);

  useEffect(() => {
    if (preloadedReview?.reviewMode) {
      setInputMode(preloadedReview.reviewMode);
    }
  }, [preloadedReview?.reviewMode]);

  const handleCopySampleLink = async () => {
    try {
      await navigator.clipboard.writeText(samplePlaylistUrl);
      setCopiedSampleLink(true);
      setTimeout(() => setCopiedSampleLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy sample playlist link', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractPlaylistIdFromUrl(playlistUrl);
    if (id) {
      setPreloadedReview(null);
      setPreloadError(null);
      setPlaylistId(id);
      setImportedAlbums([]);
    } else {
      alert("Geçersiz Spotify playlist URL'si. Lütfen kontrol edip tekrar deneyin.");
    }
  };

  const handleImageImport = (albums: SpotifyAlbum[]) => {
    setImportedAlbums(albums);
    setPlaylistId(null);
    setPreloadedReview(null);
    setPreloadError(null);
    setInputMode('plain');
  };

  return (
    <DragDropContext onDragEnd={() => {}}>
      <div className="mx-auto min-h-screen max-w-6xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-8 text-gray-100 sm:px-6 lg:px-10">
        <div className="mb-5 grid gap-3 rounded-2xl border border-gray-800/70 bg-gray-950/70 p-4 text-sm text-gray-200 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
            <p className="text-xs font-semibold uppercase text-gray-400">Step 1</p>
            <p className="mt-1 text-base font-medium">{importSource === 'playlist' ? 'Paste your Playlist link to pull every album instantly.' : 'Upload an image with album list to extract albums.'}</p>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
            <p className="text-xs font-semibold uppercase text-gray-400">Step 2</p>
            <p className="mt-1 text-base font-medium">Rate, reorder, and fine tune the lineup with drag-and-drop.</p>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
            <p className="text-xs font-semibold uppercase text-gray-400">Step 3</p>
            <p className="mt-1 text-base font-medium">Export or share once your list looks perfect.</p>
          </div>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setImportSource('playlist')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              importSource === 'playlist'
                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Import from Playlist
          </button>
          <button
            onClick={() => setImportSource('image')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              importSource === 'image'
                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <FileImage className="h-4 w-4" />
            Import from Image
          </button>
        </div>
        {importSource === 'playlist' && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-xs shadow-inner shadow-black/40">
              <span className="uppercase tracking-wide text-gray-400">Sample playlist</span>
              <a
                href={samplePlaylistUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-gray-200 transition-colors hover:text-emerald-300 truncate max-w-[240px] sm:max-w-[320px]"
              >
                {samplePlaylistUrl}
              </a>
              <button
                type="button"
                onClick={handleCopySampleLink}
                className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-gray-200 transition-colors hover:border-emerald-400 hover:text-emerald-300"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedSampleLink ? 'Copied!' : 'Copy link'}</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mb-8">
              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="Drop your playlist link to get started"
                className="mb-3 w-full rounded-2xl border border-gray-700/80 bg-gray-900/70 px-4 py-3 text-base text-gray-100 placeholder-gray-500 transition focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-center text-base font-semibold text-gray-900 transition hover:bg-emerald-400 sm:w-auto sm:px-6"
              >
                Load Albums
              </button>
            </form>
          </>
        )}
        {importSource === 'image' && (
          <div className="mb-8">
            <ImageListImporter onImportComplete={handleImageImport} />
          </div>
        )}
        {loadingReview && !preloadError && (
          <div className="mb-6 rounded border border-gray-700 bg-gray-900/70 px-4 py-3 text-sm text-gray-300">
            Loading saved review…
          </div>
        )}
        {preloadError && (
          <div className="mb-6 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {preloadError}
          </div>
        )}
        {playlistId && (
          <PlaylistAnalyzer
            playlistId={playlistId}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            initialData={preloadedInitialData}
          />
        )}
        {importedAlbums.length > 0 && !playlistId && (
          <PlaylistAnalyzer
            playlistId="imported-from-image"
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            importedAlbums={importedAlbums}
          />
        )}
      </div>
    </DragDropContext>
  );
}

export default function ReviewBuilderClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-16 text-center text-gray-200 sm:px-6 lg:px-10">
          Loading review builder…
        </div>
      }
    >
      <InnerReviewBuilder />
    </Suspense>
  );
}
