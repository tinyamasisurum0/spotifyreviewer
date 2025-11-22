import { randomUUID } from 'crypto';
import { db } from '@vercel/postgres';
import type { VercelPoolClient } from '@vercel/postgres';
import type {
  StoredTierList,
  TierId,
  TierListAlbum,
  TierListInput,
  TierMetadataMap,
} from '@/types/tier-list';
import { createDefaultTierMetadata, mergeTierMetadata } from '@/data/tierMaker';

type TierListRow = {
  tier_list_id: string;
  playlist_id: string;
  playlist_name: string;
  playlist_owner: string;
  playlist_image: string | null;
  image_data_url: string | null;
  created_at: Date | null;
  tier_metadata: unknown;
  entry_id: string | null;
  album_id: string | null;
  tier: string | null;
  position: number | null;
  album_name: string | null;
  artist: string | null;
  album_image: string | null;
  release_date: string | null;
  label: string | null;
  notes: string | null;
  rating: number | null;
  spotify_url: string | null;
};

const VALID_TIERS: TierId[] = ['unranked', 's', 'a', 'b', 'c'];

let schemaReady: Promise<void> | null = null;

async function withClient<T>(handler: (client: VercelPoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
        throw new Error(
          'Postgres connection string is not configured. Set POSTGRES_URL (or POSTGRES_URL_NON_POOLING) to enable tier list persistence.'
        );
      }

      await withClient(async (client) => {
        await client.sql`
          CREATE TABLE IF NOT EXISTS tier_lists (
            id UUID PRIMARY KEY,
            playlist_id TEXT NOT NULL,
            playlist_name TEXT NOT NULL,
            playlist_owner TEXT NOT NULL,
            playlist_image TEXT,
            image_data_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            tier_metadata JSONB
          );
        `;

        await client.sql`
          CREATE TABLE IF NOT EXISTS tier_list_albums (
            id UUID PRIMARY KEY,
            tier_list_id UUID NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
            album_id TEXT NOT NULL,
            tier TEXT NOT NULL,
            position INTEGER NOT NULL,
            name TEXT NOT NULL,
            artist TEXT NOT NULL,
            image TEXT,
            release_date TEXT,
            label TEXT,
            notes TEXT,
            rating REAL,
            spotify_url TEXT
          );
        `;

        await client.sql`
          CREATE INDEX IF NOT EXISTS tier_list_albums_list_id_idx
          ON tier_list_albums (tier_list_id, tier, position);
        `;

        await client.sql`
          ALTER TABLE tier_lists
          ADD COLUMN IF NOT EXISTS tier_metadata JSONB;
        `;
      });
    })();
  }

  return schemaReady;
}

const normalizeTier = (value: string | null): TierId => {
  if (value && VALID_TIERS.includes(value as TierId)) {
    return value as TierId;
  }
  return 'unranked';
};

const parseTierMetadata = (value: unknown): TierMetadataMap => {
  if (!value) {
    return mergeTierMetadata(null);
  }
  try {
    if (typeof value === 'string') {
      return mergeTierMetadata(JSON.parse(value));
    }
    return mergeTierMetadata(value as Record<string, unknown>);
  } catch {
    return mergeTierMetadata(null);
  }
};

function mapRowToTierList(row: TierListRow): StoredTierList {
  return {
    id: row.tier_list_id,
    playlistId: row.playlist_id,
    playlistName: row.playlist_name,
    playlistOwner: row.playlist_owner,
    playlistImage: row.playlist_image,
    imageDataUrl: row.image_data_url,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    albums: [],
    tierMetadata: parseTierMetadata(row.tier_metadata),
  };
}

function mapRowToAlbum(row: TierListRow): TierListAlbum | null {
  if (!row.entry_id || !row.album_id || row.album_name == null || row.artist == null) {
    return null;
  }
  return {
    id: row.album_id,
    name: row.album_name,
    artist: row.artist,
    image: row.album_image,
    releaseDate: row.release_date ?? '',
    label: row.label,
    notes: row.notes ?? '',
    rating: row.rating == null ? null : Number(row.rating),
    spotifyUrl: row.spotify_url,
    tier: normalizeTier(row.tier),
  };
}

export async function readTierLists(): Promise<StoredTierList[]> {
  await ensureSchema();

  const rows = await withClient(async (client) => {
    const { rows } = await client.sql<TierListRow>`
      SELECT
        l.id           AS tier_list_id,
        l.playlist_id,
        l.playlist_name,
        l.playlist_owner,
        l.playlist_image,
        l.image_data_url,
        l.created_at,
        a.id           AS entry_id,
        a.album_id,
        a.tier,
        a.position,
        a.name         AS album_name,
        a.artist,
        a.image        AS album_image,
        a.release_date,
        a.label,
        a.notes,
        a.rating,
        a.spotify_url
      FROM tier_lists l
      LEFT JOIN tier_list_albums a ON a.tier_list_id = l.id
      ORDER BY l.created_at DESC, a.tier ASC, a.position ASC;
    `;
    return rows;
  });

  const grouped = new Map<string, StoredTierList>();

  for (const row of rows) {
    let tierList = grouped.get(row.tier_list_id);
    if (!tierList) {
      tierList = mapRowToTierList(row);
      grouped.set(row.tier_list_id, tierList);
    }
    const album = mapRowToAlbum(row);
    if (album) {
      tierList.albums.push(album);
    }
  }

  return Array.from(grouped.values());
}

export async function addTierList(input: TierListInput): Promise<StoredTierList> {
  await ensureSchema();

  const tierListId = randomUUID();
  const createdAt = new Date();
  const tierMetadata = input.tierMetadata ?? createDefaultTierMetadata();

  await withClient(async (client) => {
    await client.sql`BEGIN`;

    try {
      await client.sql`
        INSERT INTO tier_lists (
          id,
          playlist_id,
          playlist_name,
          playlist_owner,
          playlist_image,
          image_data_url,
          created_at,
          tier_metadata
        ) VALUES (
          ${tierListId}::uuid,
          ${input.playlistId},
          ${input.playlistName},
          ${input.playlistOwner},
          ${input.playlistImage},
          ${input.imageDataUrl},
          ${createdAt.toISOString()}::timestamptz,
          ${JSON.stringify(tierMetadata)}::jsonb
        );
      `;

      for (let position = 0; position < input.albums.length; position += 1) {
        const album = input.albums[position];
        await client.sql`
          INSERT INTO tier_list_albums (
            id,
            tier_list_id,
            album_id,
            tier,
            position,
            name,
            artist,
            image,
            release_date,
            label,
            notes,
            rating,
            spotify_url
          ) VALUES (
            ${randomUUID()}::uuid,
            ${tierListId}::uuid,
            ${album.id},
            ${album.tier},
            ${position},
            ${album.name},
            ${album.artist},
            ${album.image},
            ${album.releaseDate},
            ${album.label},
            ${album.notes},
            ${album.rating},
            ${album.spotifyUrl}
          );
        `;
      }

      await client.sql`COMMIT`;
    } catch (error) {
      await client.sql`ROLLBACK`;
      throw error;
    }
  });

  return {
    id: tierListId,
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    playlistOwner: input.playlistOwner,
    playlistImage: input.playlistImage,
    imageDataUrl: input.imageDataUrl,
    createdAt: createdAt.toISOString(),
    albums: input.albums.map((album) => ({ ...album })),
    tierMetadata,
  };
}

export async function getTierListById(id: string): Promise<StoredTierList | null> {
  await ensureSchema();

  const rows = await withClient(async (client) => {
    const { rows } = await client.sql<TierListRow>`
      SELECT
        l.id           AS tier_list_id,
        l.playlist_id,
        l.playlist_name,
        l.playlist_owner,
        l.playlist_image,
        l.image_data_url,
        l.created_at,
        l.tier_metadata,
        a.id           AS entry_id,
        a.album_id,
        a.tier,
        a.position,
        a.name         AS album_name,
        a.artist,
        a.image        AS album_image,
        a.release_date,
        a.label,
        a.notes,
        a.rating,
        a.spotify_url
      FROM tier_lists l
      LEFT JOIN tier_list_albums a ON a.tier_list_id = l.id
      WHERE l.id = ${id}::uuid
      ORDER BY a.tier ASC, a.position ASC;
    `;
    return rows;
  });

  if (rows.length === 0) {
    return null;
  }

  const tierList = mapRowToTierList(rows[0]);
  for (const row of rows) {
    const album = mapRowToAlbum(row);
    if (album) {
      tierList.albums.push(album);
    }
  }

  return tierList;
}
