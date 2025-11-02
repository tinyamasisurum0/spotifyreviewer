import { NextResponse } from 'next/server';
import { addReview, readReviews } from '@/lib/reviews';
import type { StoredAlbum } from '@/types/review';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reviews = await readReviews();
  return NextResponse.json(reviews);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { playlistId, playlistName, playlistOwner, imageDataUrl, playlistImage } = payload ?? {};
    const albumsInput: unknown[] = Array.isArray(payload?.albums) ? payload.albums : [];
    const normalizeLabel = (value: unknown) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

    if (
      typeof playlistId !== 'string' ||
      typeof playlistName !== 'string' ||
      typeof playlistOwner !== 'string'
    ) {
      return NextResponse.json({ message: 'Invalid review payload.' }, { status: 400 });
    }

    const albums: StoredAlbum[] = albumsInput
      .map((albumEntry: unknown) => {
        if (typeof albumEntry !== 'object' || albumEntry === null) {
          return null;
        }
        const album = albumEntry as Record<string, unknown>;
        const id = typeof album.id === 'string' ? album.id : null;
        const name = typeof album.name === 'string' ? album.name : null;
        if (!id || !name) {
          return null;
        }
        return {
          id,
          name,
          artist: typeof album.artist === 'string' ? (album.artist as string) : '',
          image: typeof album.image === 'string' ? (album.image as string) : null,
          releaseDate: typeof album.releaseDate === 'string' ? (album.releaseDate as string) : '',
          label: normalizeLabel(album.label),
          notes: typeof album.notes === 'string' ? (album.notes as string) : '',
          rating: typeof album.rating === 'number' ? (album.rating as number) : null,
          spotifyUrl: typeof album.spotifyUrl === 'string' ? (album.spotifyUrl as string) : null,
        } satisfies StoredAlbum;
      })
      .filter((album): album is StoredAlbum => Boolean(album));

    const review = await addReview({
      playlistId,
      playlistName,
      playlistOwner,
      playlistImage: typeof playlistImage === 'string' ? playlistImage : null,
      albums,
      imageDataUrl: typeof imageDataUrl === 'string' ? imageDataUrl : null,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Failed to store review', error);
    return NextResponse.json({ message: 'Failed to store review.' }, { status: 500 });
  }
}
