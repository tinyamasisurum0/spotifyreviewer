import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTierListById } from '@/lib/tierLists';
import TierListDetailClient from '@/components/TierListDetailClient';

export const dynamic = 'force-dynamic';

type TierListPageProps = {
  params: {
    id: string;
  };
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://myrating.space';

const summarizeTiers = (albums: { name: string; artist: string; tier: string }[]) => {
  const ranked = albums.filter((album) => album.tier !== 'unranked');
  if (ranked.length === 0) {
    return 'Explore how this playlist was separated into 2025-ready tiers.';
  }
  const highlights = ranked.slice(0, 3).map((album) => `${album.name} (${album.tier.toUpperCase()} tier)`);
  return `Featuring ${highlights.join(', ')} and more.`;
};

export async function generateMetadata({ params }: TierListPageProps): Promise<Metadata> {
  const tierList = await getTierListById(params.id);
  if (!tierList) {
    return {
      title: 'Tier list not found',
      description: 'The requested Spotify tier list could not be located.',
      robots: {
        index: false,
      },
    };
  }

  const summary = summarizeTiers(tierList.albums);
  const pageTitle = `${tierList.playlistName} Spotify Tier List`;
  const canonicalPath = `/tier-lists/${tierList.id}`;
  const ogImage = tierList.playlistImage ?? `${siteUrl}/favicon.svg`;

  return {
    title: pageTitle,
    description: `${tierList.playlistOwner} ranked their playlist into quick tiers. ${summary}`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: pageTitle,
      description: summary,
      url: canonicalPath,
      type: 'website',
      images: [
        {
          url: ogImage,
          alt: `${tierList.playlistName} tier list`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: summary,
      images: [ogImage],
    },
  };
}

export default async function TierListPage({ params }: TierListPageProps) {
  const tierList = await getTierListById(params.id);

  if (!tierList) {
    notFound();
  }

  return <TierListDetailClient tierList={tierList} />;
}
