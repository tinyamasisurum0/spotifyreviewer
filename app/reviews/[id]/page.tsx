import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, StarHalf, ExternalLink } from 'lucide-react';
import { getReviewById } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

type ReviewDetailPageProps = {
  params: {
    id: string;
  };
};

const renderStars = (rating: number) =>
  [1, 2, 3, 4, 5].map((value) => {
    const isFull = rating >= value;
    const isHalf = !isFull && rating >= value - 0.5;
    const iconClass = `h-5 w-5 ${isFull || isHalf ? 'text-yellow-400' : 'text-gray-600'}`;

    if (isHalf) {
      return <StarHalf key={value} className={iconClass} strokeWidth={1.5} fill="currentColor" />;
    }
    if (isFull) {
      return <Star key={value} className={iconClass} strokeWidth={1.5} fill="currentColor" />;
    }
    return <Star key={value} className={iconClass} strokeWidth={1.5} />;
  });

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const review = await getReviewById(params.id);

  if (!review) {
    notFound();
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <header className="mb-10 space-y-4">
        <div className="flex flex-wrap items-start gap-4">
          {review.playlistImage && (
            <Image
              src={review.playlistImage}
              alt={`Cover art for ${review.playlistName}`}
              width={160}
              height={160}
              className="h-28 w-28 rounded-lg object-cover ring-1 ring-white/10 sm:h-32 sm:w-32"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">{review.playlistName}</h1>
            <p className="text-sm text-gray-400">
              Curated by {review.playlistOwner || 'Unknown creator'} • Shared{' '}
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
      </header>

      {review.imageDataUrl && (
        <section className="mb-10 overflow-hidden rounded-lg border border-gray-800 bg-gray-950/50">
          <Image
            src={review.imageDataUrl}
            alt={`Generated review for ${review.playlistName}`}
            width={1600}
            height={1600}
            unoptimized
            className="h-auto w-full object-cover"
          />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-gray-400">
          Album breakdown
        </h2>
        <div className="space-y-3">
          {review.albums.map((album) => (
            <article
              key={album.id}
              className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-white">{album.name}</h3>
                  <p className="text-sm text-gray-400">{album.artist}</p>
                  {album.releaseDate && (
                    <p className="text-xs text-gray-500">
                      Released {new Date(album.releaseDate).toLocaleDateString()}
                    </p>
                  )}
                  {album.spotifyUrl && (
                    <a
                      href={album.spotifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-300 hover:text-green-200"
                    >
                      Open in Spotify
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-sm text-gray-300">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Rating</span>
                  {album.rating != null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(album.rating)}</div>
                      <span className="text-yellow-200">{album.rating.toFixed(1)}/5</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">No rating yet</span>
                  )}
                </div>
              </div>
              {album.notes && (
                <p className="mt-4 whitespace-pre-wrap text-sm text-gray-300">{album.notes}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};
