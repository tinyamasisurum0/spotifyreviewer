import Image from 'next/image';
import Link from 'next/link';
import { readReviews } from '@/lib/reviews';
import DeleteReviewButton from './_components/DeleteReviewButton';

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? 'playlist-admin';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'changeme-now';

type AdminPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value ?? '';

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

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const userParam = getParamValue(searchParams?.user);
  const passParam = getParamValue(searchParams?.pass);
  const isAuthorized = userParam === ADMIN_USERNAME && passParam === ADMIN_PASSWORD;

  if (!isAuthorized) {
    return (
      <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-8">
          <h1 className="text-2xl font-semibold text-red-200">Restricted Area</h1>
          <p className="mt-2 text-sm text-red-100/80">
            Valid credentials are required to access the admin dashboard. Confirm you have the
            correct admin URL with username and password and try again.
          </p>
        </div>
      </div>
    );
  }

  const reviews = await readReviews();
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400">
            Review every saved playlist, open details, or delete entries permanently.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/60">
        <div className="grid grid-cols-[1.5rem_1.5fr_1fr_1fr_auto] gap-4 border-b border-gray-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:grid-cols-[2.5rem_2fr_1fr_1fr_auto]">
          <span>#</span>
          <span>Playlist</span>
          <span>Owner</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-gray-800">
          {sorted.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400">No reviews have been saved yet.</div>
          ) : (
            sorted.map((review, index) => (
              <div
                key={review.id}
                data-review-id={review.id}
                className="grid grid-cols-[1.5rem_1.5fr_1fr_1fr_auto] items-center gap-4 px-4 py-4 text-sm sm:grid-cols-[2.5rem_2fr_1fr_1fr_auto]"
              >
                <span className="text-xs text-gray-500">{index + 1}</span>
                <div className="flex items-center gap-3">
                  {review.playlistImage ? (
                    <Image
                      src={review.playlistImage}
                      alt={`Cover art for ${review.playlistName}`}
                      width={56}
                      height={56}
                      className="hidden h-12 w-12 rounded-md object-cover sm:block"
                    />
                  ) : (
                    <div className="hidden h-12 w-12 items-center justify-center rounded-md border border-dashed border-gray-700 text-[10px] uppercase tracking-wide text-gray-500 sm:flex">
                      No art
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{review.playlistName}</p>
                    <p className="truncate text-xs text-gray-400">{review.playlistId}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-300">
                  {review.playlistOwner || 'Unknown owner'}
                </span>
                <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/reviews/${review.id}`}
                    className="inline-flex items-center rounded border border-gray-700 px-2 py-1 text-xs font-medium text-gray-200 transition-colors hover:border-green-400 hover:text-green-200"
                  >
                    View
                  </Link>
                  <DeleteReviewButton id={review.id} name={review.playlistName} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
