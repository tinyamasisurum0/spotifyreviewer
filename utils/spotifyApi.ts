import axios from 'axios';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

// Token yönetimi için basit bir cache sistemi
let accessToken: string | null = null;
let tokenExpiration: number | null = null;

async function getAccessToken() {
  // Eğer token varsa ve süresi dolmamışsa, mevcut tokeni kullan
  if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
    return accessToken;
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
      }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

export async function getPlaylistTracks(playlistId: string) {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${SPOTIFY_BASE_URL}/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        fields: 'items(track(name,artists,album(id,name,images,release_date,label,artists,type,external_urls)))',
        limit: 100
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    throw error;
  }
}

type SpotifyAlbumDetail = {
  id: string;
  name: string;
  label: string | null;
  images: { url: string }[];
  release_date: string;
  external_urls?: { spotify?: string };
};

export type SpotifyAlbumSearchResult = {
  id: string;
  name: string;
  artists: string[];
  image: string | null;
  releaseDate: string;
  spotifyUrl: string | null;
  totalTracks: number | null;
};

export async function getAlbumsDetails(ids: string[]): Promise<Record<string, SpotifyAlbumDetail>> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const token = await getAccessToken();
  const result: Record<string, SpotifyAlbumDetail> = {};
  const chunkSize = 20;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    try {
      const response = await axios.get(`${SPOTIFY_BASE_URL}/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ids: chunk.join(','),
        },
      });

      const albums = Array.isArray(response.data?.albums) ? response.data.albums : [];
      albums.forEach((album: any) => {
        if (album && typeof album.id === 'string') {
          result[album.id] = {
            id: album.id,
            name: album.name ?? '',
            label: album.label ?? null,
            images: Array.isArray(album.images) ? album.images : [],
            release_date: album.release_date ?? '',
            external_urls: album.external_urls,
          };
        }
      });
    } catch (error) {
      console.error('Error fetching album details:', error);
    }
  }

  return result;
}

export async function searchAlbums(query: string, limit = 12): Promise<SpotifyAlbumSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const token = await getAccessToken();
    const response = await axios.get(`${SPOTIFY_BASE_URL}/search`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query,
        type: 'album',
        limit,
      },
    });

    const albums = Array.isArray(response.data?.albums?.items) ? response.data.albums.items : [];

    return albums.map((album: any) => ({
      id: album.id ?? crypto.randomUUID(),
      name: album.name ?? 'Unknown album',
      artists: Array.isArray(album.artists) ? album.artists.map((artist: any) => artist?.name).filter(Boolean) : [],
      image:
        Array.isArray(album.images) && album.images.length > 0
          ? album.images.sort((a: any, b: any) => (b?.height ?? 0) - (a?.height ?? 0))[0]?.url ?? null
          : null,
      releaseDate: album.release_date ?? '',
      spotifyUrl: album.external_urls?.spotify ?? null,
      totalTracks: typeof album.total_tracks === 'number' ? album.total_tracks : null,
    }));
  } catch (error) {
    console.error('Error searching albums:', error);
    throw error;
  }
}

export async function getPlaylistDetails(playlistId: string) {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${SPOTIFY_BASE_URL}/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      name: response.data.name,
      owner: response.data.owner.display_name,
      image: Array.isArray(response.data.images) && response.data.images.length > 0
        ? response.data.images[0].url
        : null,
    };
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    throw error;
  }
}


export function extractPlaylistIdFromUrl(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
