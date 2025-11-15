'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy } from 'lucide-react';
import { extractPlaylistIdFromUrl } from '@/utils/spotifyApi';
import TierMakerBoard from './TierMakerBoard';
import { tierDefinitions } from '@/data/tierMaker';

export default function TierMakerClient() {
  const searchParams = useSearchParams();
  const initialPlaylistId = searchParams.get('playlistId');
  const [playlistUrl, setPlaylistUrl] = useState(() =>
    initialPlaylistId ? `https://open.spotify.com/playlist/${initialPlaylistId}` : ''
  );
  const [playlistId, setPlaylistId] = useState<string | null>(initialPlaylistId);
  const [copiedSampleLink, setCopiedSampleLink] = useState(false);
  const samplePlaylistUrl = 'https://open.spotify.com/playlist/0xy8aNki7WxsM42dkTOmER';

  useEffect(() => {
    if (initialPlaylistId) {
      setPlaylistId(initialPlaylistId);
      setPlaylistUrl(`https://open.spotify.com/playlist/${initialPlaylistId}`);
    }
  }, [initialPlaylistId]);

  const handleCopySampleLink = async () => {
    try {
      await navigator.clipboard.writeText(samplePlaylistUrl);
      setCopiedSampleLink(true);
      setTimeout(() => setCopiedSampleLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy sample playlist link', error);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const id = extractPlaylistIdFromUrl(playlistUrl);
    if (id) {
      setPlaylistId(id);
    } else {
      alert("Invalid Spotify playlist URL. Make sure you're pasting a playlist link.");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gray-950/70 p-5 shadow-inner shadow-black/50">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Structure Your Album Tier List</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Drop one playlist link, drag albums into S → C tiers, export instantly.
        </h1>
        <p className="mt-4 text-base text-gray-300">
          Once your playlist is loaded, use the existing controls to communicate tiers without any extra tooling.
          Reorder freely, leave quick notes, then download or share just like the review builder.
        </p>
        <div className="mt-5 grid gap-4 rounded-xl border border-gray-800/70 bg-gray-900/40 p-4 text-sm text-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {tierDefinitions.map((tier) => (
            <div key={tier.id} className="rounded-lg border border-gray-800/80 bg-gray-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{tier.label}</p>
              <p className="mt-2 text-sm text-gray-300">{tier.subheading}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-xs shadow-inner shadow-black/40">
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

      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        <input
          type="text"
          value={playlistUrl}
          onChange={(event) => setPlaylistUrl(event.target.value)}
          placeholder="Paste your Spotify playlist link"
          className="w-full rounded-2xl border border-gray-700/80 bg-gray-900/70 px-4 py-3 text-base text-gray-100 placeholder-gray-500 transition focus:border-emerald-400 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-center text-base font-semibold text-gray-900 transition hover:bg-emerald-400 sm:w-auto sm:px-6"
        >
          Load Albums
        </button>
      </form>

      {playlistId ? (
        <TierMakerBoard playlistId={playlistId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-700/80 bg-gray-900/50 p-6 text-center text-gray-400">
          Paste a playlist link to start sorting your tiers.
        </div>
      )}
    </div>
  );
}
