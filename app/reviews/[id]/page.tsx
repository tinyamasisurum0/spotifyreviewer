import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReviewById } from '@/lib/reviews';
import ReviewDetailClient from '@/components/ReviewDetailClient';
import type { StoredAlbum } from '@/types/review';

export const dynamic = 'force-dynamic';

type ReviewDetailPageProps = {
  params: {
    id: string;
  };
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://myrating.space';

const buildAlbumSummary = (albums: StoredAlbum[]) => {
  const highlights = albums.slice(0, 3).map((album) => {
    const artist = album.artist && album.artist.trim().length > 0 ? album.artist : 'Unknown Artist';
    return `${album.name} by ${artist}`;
  });
  if (highlights.length === 0) {
    return 'Dive into album rankings, notes, and ratings from this playlist review.';
  }
  if (highlights.length === 1) {
    return `Highlights ${highlights[0]} with track-by-track impressions.`;
  }
  return `Highlights ${highlights.slice(0, -1).join(', ')} and ${highlights.at(-1)} with detailed impressions.`;
};

const collectAlbumNotes = (albums: StoredAlbum[]) => {
  const snippets = albums
    .map((album) => album.notes?.trim())
    .filter((value): value is string => Boolean(value));
  if (snippets.length === 0) {
    return 'Explore rankings, ratings, and release details for every featured record.';
  }
  const combined = snippets.join(' ');
  return combined.length > 280 ? `${combined.slice(0, 277)}…` : combined;
};

export async function generateMetadata({
  params,
}: ReviewDetailPageProps): Promise<Metadata> {
  const review = await getReviewById(params.id);

  if (!review) {
    return {
      title: 'Playlist review not found',
      description: 'The requested Spotify playlist review could not be located.',
      robots: {
        index: false,
      },
    };
  }

  const albumSummary = buildAlbumSummary(review.albums);
  const notesSnippet = collectAlbumNotes(review.albums);
  const albumKeywords = review.albums.flatMap((album) =>
    [album.name, album.artist].filter((value): value is string => Boolean(value && value.trim()))
  );
  const pageTitle = `${review.playlistName} Playlist Review`;
  const canonicalPath = `/reviews/${review.id}`;
  const ogImage = review.imageDataUrl
    ? `${siteUrl}/reviews/${review.id}/og`
    : review.playlistImage ?? `${siteUrl}/favicon.svg`;

  return {
    title: pageTitle,
    description: `${review.playlistOwner || 'Unknown curator'} breaks down "${review.playlistName}". ${albumSummary} ${notesSnippet}`,
    alternates: {
      canonical: canonicalPath,
    },
    keywords: [
      review.playlistName,
      review.playlistOwner ?? 'playlist curator',
      ...albumKeywords,
      'Spotify playlist review',
      'album rankings',
      'music review notes',
    ],
    openGraph: {
      title: pageTitle,
      description: `${review.playlistOwner || 'Unknown curator'} shares album impressions from "${review.playlistName}". ${albumSummary}`,
      url: canonicalPath,
      type: 'article',
      images: [
        {
          url: ogImage,
          alt: `${review.playlistName} review collage`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: `${review.playlistOwner || 'Unknown curator'} shares highlight albums from "${review.playlistName}".`,
      images: [ogImage],
    },
  };
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const review = await getReviewById(params.id);

  if (!review) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${review.playlistName} playlist review`,
    description: collectAlbumNotes(review.albums),
    url: `${siteUrl}/reviews/${review.id}`,
    itemListElement: review.albums.map((album, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'MusicAlbum',
        name: album.name,
        byArtist: album.artist
          ? {
              '@type': 'MusicGroup',
              name: album.artist,
            }
          : undefined,
        image: album.image ?? undefined,
        datePublished: album.releaseDate ?? undefined,
        url: album.spotifyUrl ?? undefined,
        review: album.notes
          ? {
              '@type': 'Review',
              reviewBody: album.notes,
              author: review.playlistOwner
                ? {
                    '@type': 'Person',
                    name: review.playlistOwner,
                  }
                : undefined,
              reviewRating:
                album.rating != null
                  ? {
                      '@type': 'Rating',
                      ratingValue: album.rating,
                      bestRating: 5,
                    }
                  : undefined,
            }
          : undefined,
      },
    })),
    author: review.playlistOwner
      ? {
          '@type': 'Person',
          name: review.playlistOwner,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReviewDetailClient review={review} />
    </>
  );
}
