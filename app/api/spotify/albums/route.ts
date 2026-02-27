import { NextResponse } from 'next/server';
import { getAlbumsDetails } from '@/utils/spotifyApi';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of album IDs required.' },
        { status: 400 }
      );
    }

    const limitedIds = ids.slice(0, 100);
    const albums = await getAlbumsDetails(limitedIds);

    return NextResponse.json({ albums });
  } catch (error) {
    console.error('Failed to fetch album details', error);
    return NextResponse.json(
      { error: 'Failed to fetch album details.' },
      { status: 500 }
    );
  }
}
