import { NextResponse } from 'next/server';
import { searchAlbums } from '@/utils/spotifyApi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? searchParams.get('query') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 0, 1), 20) : 12;

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
  }

  try {
    const albums = await searchAlbums(query, limit);
    return NextResponse.json({ albums });
  } catch (error) {
    console.error('Spotify album search failed', error);
    return NextResponse.json({ error: 'Failed to search Spotify.' }, { status: 500 });
  }
}
