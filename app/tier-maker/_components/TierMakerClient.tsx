'use client';

import TierMakerBoard from './TierMakerBoard';

export default function TierMakerClient() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <div className="mb-5 grid gap-3 rounded-2xl border border-gray-800/70 bg-gray-950/70 p-4 text-sm text-gray-200 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
          <p className="text-xs font-semibold uppercase text-gray-400">Step 1</p>
          <p className="mt-1 text-base font-medium">Search albums or paste a playlist link to load instantly.</p>
        </div>
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
          <p className="text-xs font-semibold uppercase text-gray-400">Step 2</p>
          <p className="mt-1 text-base font-medium">Drag albums into S → C tiers and add quick notes.</p>
        </div>
        <div className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-3">
          <p className="text-xs font-semibold uppercase text-gray-400">Step 3</p>
          <p className="mt-1 text-base font-medium">Export or share once your tier list looks perfect.</p>
        </div>
      </div>

      <TierMakerBoard />
    </div>
  );
}
