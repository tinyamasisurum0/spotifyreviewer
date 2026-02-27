import { NextResponse } from 'next/server';
import {
  getPlaylistTracks,
  getPlaylistDetails,
  getAlbumsDetails,
} from '@/utils/spotifyApi';
import { extractPlaylistIdFromUrl } from '@/utils/spotify';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const playlistId =
      typeof url === 'string' ? extractPlaylistIdFromUrl(url) || url : null;

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid playlist URL or ID.' },
        { status: 400 }
      );
    }

    // Fetch tracks and playlist details in parallel
    const [tracks, details] = await Promise.all([
      getPlaylistTracks(playlistId),
      getPlaylistDetails(playlistId),
    ]);

    // Extract unique album IDs from tracks
    interface TrackItem {
      track?: { album?: { id?: string } };
    }
    const albumIds = Array.from(new Set(
      (tracks as TrackItem[])
        .map((item) => item?.track?.album?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ));

    // Fetch album details (batches run in parallel internally)
    const albumDetails =
      albumIds.length > 0 ? await getAlbumsDetails(albumIds) : {};

    return NextResponse.json({ tracks, playlist: details, albumDetails });
  } catch (error) {
    console.error('Failed to load playlist', error);
    return NextResponse.json(
      { error: 'Failed to load playlist from Spotify.' },
      { status: 500 }
    );
  }
}
