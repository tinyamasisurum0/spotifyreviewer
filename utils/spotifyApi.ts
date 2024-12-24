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
        fields: 'items(track(name,artists,album(name,images,release_date,label,artists,type)))',
        limit: 100
      }
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
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

