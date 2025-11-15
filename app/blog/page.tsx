import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';

const title = 'Best Albums 2025 & Album Tier List Guide';
const description =
  'Discover the best albums of 2025, see how they stack up in a living album tier list, and learn how to build and share your own music rankings.';

const builderSteps = [
  {
    title: 'Paste a Spotify playlist URL',
    body: 'Drop any Spotify playlist into the Review Builder to pull in album art, release dates, labels, and artist info automatically.',
  },
  {
    title: 'Drag albums into order',
    body: 'Use the built-in drag and drop controls to lock your best albums 2025 list from top pick to hidden gem.',
  },
  {
    title: 'Add notes and ratings',
    body: 'Each album includes fields for a score and written impressions, so you can explain why an entry belongs in a specific tier.',
  },
  {
    title: 'Switch views & export',
    body: 'Toggle between plain, review, rating, or hybrid layouts, then export a JPEG or share the hosted review link.',
  },
];

const tierIdeas = [
  {
    title: 'S Tier – Essentials',
    body: 'Keep your absolute must-hear picks at the very top of the list and highlight them with the existing rank decorations.',
  },
  {
    title: 'A Tier – Heavy Rotation',
    body: 'Use the notes panel to summarize why these albums stay in your queue all year.',
  },
  {
    title: 'B Tier – Solid Finds',
    body: 'Perfect place for albums that hit a niche mood. Mention the mood inside the notes so friends know when to spin them.',
  },
  {
    title: 'C Tier – Revisit Later',
    body: 'Hide rank decorations for a simple list and leave reminders for albums you want to revisit as 2025 unfolds.',
  },
];

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/blog',
  },
  keywords: [
    'best albums 2025',
    '2025 album releases',
    'album tier list',
    'music ranking tools',
    'Spotify playlist review blog',
  ],
  openGraph: {
    title,
    description,
    url: '/blog',
    type: 'article',
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
  },
};

export default function BlogPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-gray-900 px-4 py-12 text-gray-100 sm:px-6 lg:px-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Blog</p>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Best Albums 2025 & An Album Tier List You Can Remix
        </h1>
        <p className="text-base text-gray-300">
          This guide explains how we track the best albums 2025 conversation directly inside the
          <Link
            href="/review-builder"
            className="ml-1 text-emerald-200 underline decoration-emerald-500/60 decoration-2 underline-offset-4 hover:text-emerald-100"
          >
            review builder
          </Link>
          . Everything below maps to the existing tools, so you can recreate the process on your own
          playlists.
        </p>
      </header>

      <section className="mt-12 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">
            Track the Best Albums 2025 Conversation
          </h2>
          <p className="text-sm text-gray-400">
            The Review Builder keeps your nomination list, artwork, and liner notes in one place.
            Follow these steps to build a living hub for your album tier list.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {builderSteps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow"
            >
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-300">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Structure Your Album Tier List</h2>
          <p className="text-sm text-gray-400">
            Once your playlist is loaded, use the existing controls to communicate tiers without any
            extra tooling.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tierIdeas.map((tier) => (
            <article
              key={tier.title}
              className="rounded-xl border border-gray-800 bg-gray-950/70 p-5"
            >
              <h3 className="text-lg font-semibold text-white">{tier.title}</h3>
              <p className="mt-2 text-sm text-gray-300">{tier.body}</p>
            </article>
          ))}
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-gray-900/70 p-6">
          <h3 className="text-xl font-semibold text-white">Ready to publish?</h3>
          <p className="mt-2 text-sm text-gray-300">
            Paste a playlist, rearrange the albums, toggle the layout, and export a high-resolution
            collage or link to the hosted review. That&apos;s all you need to present your best
            albums 2025 tier list.
          </p>
          <Link
            href="/review-builder"
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
          >
            Create a Playlist Review
          </Link>
        </div>
      </section>
    </div>
  );
}
