import type { Metadata } from 'next';
import TierMakerBoard from '../tier-maker/_components/TierMakerBoard';

export const dynamic = 'force-dynamic';

const title = 'Topster: Build a visual album grid';
const description =
  'Search any album on Spotify, drop it into your board, then export or share your custom Topster-style grid.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/topster',
  },
  openGraph: {
    title,
    description,
    url: '/topster',
    type: 'website',
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
  },
};

export default function TopsterPage() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gray-950/70 p-5 shadow-inner shadow-black/50">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Topster mode</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Drag albums from search to craft your Topster board.
        </h1>
        <p className="mt-3 text-base text-gray-300">
          No playlist required. Use the search inside the Unsorted Bench to pull any album from Spotify, then drag into
          S through C tiers and export a shareable grid.
        </p>
      </div>
      <TierMakerBoard manualMode playlistId="spotify-search-tier" />
    </div>
  );
}
