import type { Metadata } from 'next';
import TierMakerClient from './_components/TierMakerClient';

export const dynamic = 'force-dynamic';

const title = 'Spotify Playlist Tier Maker';
const description =
  'Drop a Spotify playlist URL, drag albums into S through C tiers, add notes, then export and share a tier template built for 2025 debates.';

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: '/tier-maker',
    },
    openGraph: {
      title,
      description,
      url: '/tier-maker',
      type: 'website',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
}

export default function TierMakerPage() {
  return <TierMakerClient />;
}
