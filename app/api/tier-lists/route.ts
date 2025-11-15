import { NextResponse } from 'next/server';
import { addTierList, readTierLists } from '@/lib/tierLists';
import type { TierId, TierListAlbum } from '@/types/tier-list';

export const dynamic = 'force-dynamic';

const allowedTiers: TierId[] = ['unranked', 's', 'a', 'b', 'c'];

const normalizeTier = (value: unknown): TierId => {
  if (typeof value === 'string' && allowedTiers.includes(value as TierId)) {
    return value as TierId;
  }
  return 'unranked';
};

export async function GET() {
  const tierLists = await readTierLists();
  return NextResponse.json(tierLists);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { playlistId, playlistName, playlistOwner, playlistImage, imageDataUrl } = payload ?? {};
    const albumsInput: unknown[] = Array.isArray(payload?.albums) ? payload.albums : [];

    if (
      typeof playlistId !== 'string' ||
      typeof playlistName !== 'string' ||
      typeof playlistOwner !== 'string'
    ) {
      return NextResponse.json({ message: 'Invalid tier list payload.' }, { status: 400 });
    }

    const albums: TierListAlbum[] = albumsInput
      .map((albumEntry: unknown) => {
        if (typeof albumEntry !== 'object' || albumEntry === null) {
          return null;
        }
        const album = albumEntry as Record<string, unknown>;
        if (typeof album.id !== 'string' || typeof album.name !== 'string') {
          return null;
        }
        return {
          id: album.id,
          name: album.name,
          artist: typeof album.artist === 'string' ? album.artist : '',
          image: typeof album.image === 'string' ? album.image : null,
          releaseDate: typeof album.releaseDate === 'string' ? album.releaseDate : '',
          label: typeof album.label === 'string' ? album.label : null,
          notes: typeof album.notes === 'string' ? album.notes : '',
          rating: typeof album.rating === 'number' ? album.rating : null,
          spotifyUrl: typeof album.spotifyUrl === 'string' ? album.spotifyUrl : null,
          tier: normalizeTier(album.tier),
        } satisfies TierListAlbum;
      })
      .filter((album): album is TierListAlbum => Boolean(album));

    const tierList = await addTierList({
      playlistId,
      playlistName,
      playlistOwner,
      playlistImage: typeof playlistImage === 'string' ? playlistImage : null,
      imageDataUrl: typeof imageDataUrl === 'string' ? imageDataUrl : null,
      albums,
    });

    return NextResponse.json(tierList, { status: 201 });
  } catch (error) {
    console.error('Failed to store tier list', error);
    return NextResponse.json({ message: 'Failed to store tier list.' }, { status: 500 });
  }
}
