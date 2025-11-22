import type { Metadata } from 'next';
import AlbumSearchClient from './_components/AlbumSearchClient';

export const dynamic = 'force-dynamic';

const title = 'Spotify Album Search Tester';
const description = 'Search Spotify albums via API and preview cover art, artist info, and links.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/spotify-search',
  },
  openGraph: {
    title,
    description,
    url: '/spotify-search',
    type: 'website',
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
  },
};

export default function SpotifySearchPage() {
  return <AlbumSearchClient />;
}
