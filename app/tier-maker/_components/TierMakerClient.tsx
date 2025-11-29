'use client';

import TierMakerBoard from './TierMakerBoard';
import { tierDefinitions } from '@/data/tierMaker';

export default function TierMakerClient() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gray-950/70 p-5 shadow-inner shadow-black/50">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Structure Your Album Tier List</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Search albums or load a playlist, drag into S → C tiers, export instantly.
        </h1>
        <p className="mt-4 text-base text-gray-300">
          Use the search box to find albums or paste a playlist link to load all albums at once.
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

      <TierMakerBoard />
    </div>
  );
}
