import Image from 'next/image';
import Link from 'next/link';
import { readReviews } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

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

export default async function ReviewsPage() {
  const reviews = await readReviews();
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Review Listing</h1>
          <p className="text-sm text-gray-400">
            Browse every playlist review that has been shared from the generator.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/review-builder"
            className="inline-flex items-center gap-2 rounded bg-green-500 px-3 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
          >
            Start a new review
          </Link>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/70 p-10 text-center text-gray-400">
          No shared reviews yet. Create one on the home page and save it to see it listed here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {sorted.map((review) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="group flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/70 p-3 shadow-md transition-colors hover:border-green-400/60 sm:p-4"
            >
              {review.playlistImage ? (
                <div className="mb-3 overflow-hidden rounded-md border border-gray-800">
                  <Image
                    src={review.playlistImage}
                    alt={`Cover art for ${review.playlistName}`}
                    width={320}
                    height={320}
                    sizes="160px"
                    className="h-28 w-full object-cover sm:h-32"
                  />
                </div>
              ) : (
                <div className="mb-3 flex h-28 w-full items-center justify-center rounded-md border border-dashed border-gray-700 text-xs uppercase tracking-wide text-gray-500 sm:h-32">
                  No cover image
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="truncate text-base font-semibold text-white transition-colors group-hover:text-green-200 sm:text-lg">
                  {review.playlistName}
                </h2>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 sm:text-xs">
                  {review.playlistOwner || 'Unknown owner'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 sm:text-xs">
                  <span>Albums: {review.albums.length}</span>
                  <span className="truncate">Shared {formatDate(review.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
