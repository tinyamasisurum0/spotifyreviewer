import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { readReviews } from '@/lib/reviews';
import { readTierLists } from '@/lib/tierLists';
import { tierDefinitions, mergeTierMetadata } from '@/data/tierMaker';

export const dynamic = 'force-dynamic';

const title = 'Latest Spotify Playlist Reviews';
const description =
  'Browse every Spotify playlist review shared with myrating.space. Discover standout albums, artists, and curated rankings from music fans.';

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: '/reviews',
    },
    openGraph: {
      title,
      description,
      url: '/reviews',
      type: 'website',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
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

export default async function ReviewsPage() {
  const [reviews, tierLists] = await Promise.all([readReviews(), readTierLists()]);
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const sortedTierLists = [...tierLists].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-8 flex justify-center">
        <Link
          href="/review-builder"
          className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-emerald-400 bg-gray-900/60 px-6 py-3 text-base font-semibold text-emerald-200 shadow-md transition hover:border-emerald-300 hover:text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Start Your Review
        </Link>
      </div>
      <header className="mb-6 text-center sm:text-left">
        <h1 className="text-3xl font-bold">Reviews Shared by Other People</h1>
        <p className="text-sm text-gray-400">
          Browse every playlist review that has been shared from the generator.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-700 bg-gray-800/70 p-10 text-center text-gray-400">
          No shared reviews yet. Create one on the home page and save it to see it listed here.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((review) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="group flex h-full flex-col rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-md transition-colors hover:border-emerald-400/60"
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {review.playlistImage ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-800">
                      <Image
                        src={review.playlistImage}
                        alt={`Cover art for ${review.playlistName}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-gray-700 text-[10px] uppercase tracking-wide text-gray-500">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <h2 className="truncate text-base font-semibold text-white transition-colors group-hover:text-emerald-200">
                      {review.playlistName}
                    </h2>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {review.playlistOwner || 'Unknown owner'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {review.albums.length} album{review.albums.length === 1 ? '' : 's'}
                    </span>
                    <span className="truncate">Shared {formatDate(review.createdAt)}</span>
                  </div>
                  {review.albums.length > 0 && (
                    <p className="line-clamp-2 text-xs text-gray-300">
                      Featuring{' '}
                      {review.albums
                        .slice(0, 2)
                        .map((album) => `${album.name} — ${album.artist || 'Unknown Artist'}`)
                        .join('; ')}
                      {review.albums.length > 2 ? '…' : ''}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section id="tier-lists" className="mt-16 space-y-4">
        <div className="flex justify-center">
          <Link
            href="/tier-maker"
            className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-emerald-400 bg-gray-900/60 px-6 py-3 text-base font-semibold text-emerald-200 shadow-md transition hover:border-emerald-300 hover:text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Launch Tier Maker
          </Link>
        </div>
        <header className="text-left">
          <h2 className="text-2xl font-semibold text-white">Shared Tier Lists</h2>
          <p className="text-sm text-gray-400">
            Playlist curators dragging their albums into S → C lanes.
          </p>
        </header>
        {sortedTierLists.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/70 p-8 text-center text-gray-400">
            Tier maker saves will show up here once someone shares their board.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sortedTierLists.map((tierList) => {
              const tierMetadata = mergeTierMetadata(tierList.tierMetadata);
              const artPreview = tierList.albums
                .filter((album) => album.tier !== 'unranked' && album.image)
                .slice(0, 4);
              const tierCounts = tierDefinitions.map((tier) => ({
                id: tier.id,
                label: tierMetadata[tier.id]?.title ?? tier.label,
                count: tierList.albums.filter((album) => album.tier === tier.id).length,
              }));

              return (
                <Link
                  key={tierList.id}
                  href={`/tier-lists/${tierList.id}`}
                  className="group flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/70 p-4 shadow-md transition hover:border-emerald-400/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white group-hover:text-emerald-200">
                        {tierList.playlistName}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {tierList.playlistOwner}
                      </p>
                    </div>
                    <span className="rounded-full border border-gray-700 px-3 py-1 text-[10px] uppercase tracking-wide text-gray-300">
                      {new Date(tierList.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {artPreview.length === 0 ? (
                      <div className="col-span-4 flex h-16 items-center justify-center rounded-lg border border-dashed border-gray-700 text-[10px] uppercase tracking-widest text-gray-500">
                        Tier screenshots pending
                      </div>
                    ) : (
                      artPreview.map((album) => (
                        <div
                          key={album.id}
                          className="relative h-16 w-full overflow-hidden rounded-lg border border-gray-800"
                        >
                          <Image
                            src={album.image!}
                            alt={album.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
                    {tierCounts.map((tier) => (
                      <span key={tier.id} className="flex items-center justify-between rounded border border-gray-800 px-2 py-1">
                        <span className="truncate">
                          {tier.label.includes('–') ? tier.label.split('–')[0].trim() : tier.label}
                        </span>
                        <span className="font-semibold text-gray-200">{tier.count}</span>
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
