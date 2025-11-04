import type { Metadata } from 'next';
import ReviewBuilderClient from './_components/ReviewBuilderClient';

export const dynamic = 'force-dynamic';

const title = 'Build a Spotify Playlist Review';
const description =
  'Paste a Spotify playlist URL, reorder albums, add ratings and notes, then export a shareable review image that highlights every artist in your roundup.';

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: '/review-builder',
    },
    openGraph: {
      title,
      description,
      url: '/review-builder',
      type: 'website',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
}

export default function ReviewBuilderPage() {
  return <ReviewBuilderClient />;
}
