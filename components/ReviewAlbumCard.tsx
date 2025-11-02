import Image from 'next/image';
import { Star, StarHalf, ExternalLink } from 'lucide-react';
import type { StoredAlbum } from '@/types/review';
import { getRankDecoration } from '@/components/rankDecorations';

interface ReviewAlbumCardProps {
  album: StoredAlbum;
  index: number;
}

const formatRating = (rating: number | null) => {
  if (rating == null) {
    return 'No rating';
  }
  const display = Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
  return `${display}/5`;
};

const renderRatingStars = (rating: number | null) => {
  const safeRating = rating ?? 0;
  return [1, 2, 3, 4, 5].map((star) => {
    const isFull = safeRating >= star;
    const isHalf = !isFull && safeRating >= star - 0.5;
    const iconClass = isFull || isHalf ? 'text-yellow-400' : 'text-gray-500';

    if (isFull) {
      return <Star key={star} className={`h-8 w-8 ${iconClass}`} strokeWidth={1.5} fill="currentColor" />;
    }
    if (isHalf) {
      return <StarHalf key={star} className={`h-8 w-8 ${iconClass}`} strokeWidth={1.5} fill="currentColor" />;
    }
    return <Star key={star} className={`h-8 w-8 ${iconClass}`} strokeWidth={1.5} />;
  });
};

export default function ReviewAlbumCard({ album, index }: ReviewAlbumCardProps) {
  const rankDecoration = getRankDecoration(index);
  const badge = rankDecoration?.badge;
  const BadgeIcon = badge?.icon;
  const baseBackgroundClass = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700';
  const cardClassName = `relative rounded-lg ${
    rankDecoration ? `overflow-hidden ${rankDecoration.containerClass}` : baseBackgroundClass
  }`;
  const rankNumberClass = rankDecoration?.numberClass ?? 'text-gray-300';
  const titleClassName = `text-lg font-semibold ${rankDecoration?.titleClass ?? ''}`.trim();
  const artistClassName = `${rankDecoration?.artistClass ?? 'text-gray-400'}`.trim();

  return (
    <div
      className={cardClassName}
      style={rankDecoration?.containerStyle}
    >
      {badge && (
        <div
          className={`pointer-events-none absolute bottom-0 left-0 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {BadgeIcon && <BadgeIcon className={`h-4 w-4 ${badge.iconClassName}`} />}
          <span>{badge.label}</span>
        </div>
      )}
      <div className="relative z-10 flex flex-col gap-4 p-4 pb-12 lg:flex-row lg:items-start lg:gap-6">
        <p className={`self-start text-lg font-semibold lg:mt-1 ${rankNumberClass}`}>{index + 1}</p>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="relative mx-auto aspect-square w-full max-w-xs flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/5 sm:mx-0 sm:w-48 sm:max-w-none lg:w-64">
            <Image
              src={album.image || '/placeholder.svg'}
              alt={album.name}
              fill
              className="rounded-lg object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className={titleClassName}>{album.name}</h3>
            <p className={artistClassName}>{album.artist || 'Unknown Artist'}</p>
            {album.releaseDate && (
              <p className="text-sm text-gray-500">
                Release Date: {new Date(album.releaseDate).toLocaleDateString()}
              </p>
            )}
            {album.spotifyUrl && (
              <a
                href={album.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-300 transition-colors hover:text-green-200"
              >
                Open in Spotify
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-1/2">
          <div className="rounded border border-gray-600 bg-gray-800 p-3">
            <p className="mb-2 text-sm text-gray-400">Rating</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {renderRatingStars(album.rating)}
              </div>
              <span className="text-sm text-gray-400">{formatRating(album.rating)}</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-400">Review</p>
            <div className="h-48 w-full overflow-y-auto whitespace-pre-wrap rounded border border-gray-600 bg-gray-800 p-2 text-base text-white sm:text-lg">
              {album.notes?.trim().length ? album.notes : 'No written review.'}
            </div>
          </div>
        </div>
      </div>
      {rankDecoration?.accentBarClass && (
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${rankDecoration.accentBarClass}`} />
      )}
    </div>
  );
}
