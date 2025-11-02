'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { StoredAlbum } from '@/types/review';
import ReviewAlbumCard from '@/components/ReviewAlbumCard';

interface ReviewAlbumsDisplayProps {
  albums: StoredAlbum[];
  isPlainView: boolean;
  onTogglePlainView: () => void;
  plainViewRef: RefObject<HTMLDivElement>;
  detailsViewRef: RefObject<HTMLDivElement>;
  hideSpotifyLinks?: boolean;
}

const fallbackText = (value: string | null | undefined, fallback: string) =>
  value && value.trim().length > 0 ? value : fallback;

const formatReleaseDate = (value: string | null | undefined) => {
  if (!value) {
    return 'Unknown date';
  }
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

function PlainAlbumTile({ album, hideSpotifyLinks }: { album: StoredAlbum; hideSpotifyLinks?: boolean }) {
  const artist = fallbackText(album.artist, 'Unknown Artist');
  const label = fallbackText(album.label, 'Unknown Label');
  const releaseDate = formatReleaseDate(album.releaseDate);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-sm">
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950/80">
        {album.image ? (
          <Image src={album.image} alt={album.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-gray-500">
            No Image
          </div>
        )}
        {album.spotifyUrl && !hideSpotifyLinks && (
          <a
            href={album.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-gray-200 transition hover:bg-black/90"
            aria-label={`Open ${album.name} in Spotify`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="truncate text-sm font-semibold text-white">{album.name}</h3>
        <p className="truncate text-xs text-gray-400">{artist}</p>
        <p className="text-xs text-gray-500">Released {releaseDate}</p>
        <p className="truncate text-xs text-gray-500">Label · {label}</p>
      </div>
    </div>
  );
}

export default function ReviewAlbumsDisplay({
  albums,
  isPlainView,
  onTogglePlainView,
  plainViewRef,
  detailsViewRef,
  hideSpotifyLinks,
}: ReviewAlbumsDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onTogglePlainView}
          className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
        >
          {isPlainView ? 'Detailed View' : 'Plain View'}
        </button>
      </div>
      <div className={isPlainView ? 'pb-6' : 'hidden'} ref={plainViewRef}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {albums.map((album) => (
            <PlainAlbumTile key={album.id} album={album} hideSpotifyLinks={hideSpotifyLinks} />
          ))}
        </div>
        {isPlainView && <div className="mt-4 h-1 w-full" aria-hidden />}
      </div>
      {!isPlainView && (
        <div className="space-y-4" ref={detailsViewRef}>
          {albums.map((album, index) => (
            <ReviewAlbumCard key={album.id} album={album} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
