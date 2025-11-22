import { randomUUID } from 'crypto';
import { db } from '@vercel/postgres';
import type { VercelPoolClient } from '@vercel/postgres';
import type { ReviewInput, StoredAlbum, StoredReview, ReviewMode } from '@/types/review';

type ReviewRow = {
  review_id: string;
  playlist_id: string;
  playlist_name: string;
  playlist_owner: string;
  playlist_image: string | null;
  image_data_url: string | null;
  review_mode: ReviewMode;
  created_at: Date | null;
  album_row_id: string | null;
  album_id: string | null;
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

const VALID_MODES: ReviewMode[] = ['review', 'plain', 'rating', 'both'];

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
          'Postgres connection string is not configured. Set POSTGRES_URL (or POSTGRES_URL_NON_POOLING) to enable review persistence.'
        );
      }

      await withClient(async (client) => {
        await client.sql`
          CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY,
            playlist_id TEXT NOT NULL,
            playlist_name TEXT NOT NULL,
            playlist_owner TEXT NOT NULL,
            playlist_image TEXT,
            image_data_url TEXT,
            review_mode TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `;

        await client.sql`
          CREATE TABLE IF NOT EXISTS review_albums (
            id UUID PRIMARY KEY,
            review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
            album_id TEXT NOT NULL,
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
          CREATE INDEX IF NOT EXISTS review_albums_review_id_idx
          ON review_albums (review_id, position);
        `;
      });
    })();
  }

  return schemaReady;
}

function mapRowToAlbum(row: ReviewRow): StoredAlbum | null {
  if (!row.album_row_id || !row.album_id || row.album_name == null || row.artist == null) {
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
  };
}

function mapRowToReview(row: ReviewRow): StoredReview {
  const reviewMode = VALID_MODES.includes(row.review_mode) ? row.review_mode : 'review';
  return {
    id: row.review_id,
    playlistId: row.playlist_id,
    playlistName: row.playlist_name,
    playlistOwner: row.playlist_owner,
    playlistImage: row.playlist_image,
    albums: [],
    imageDataUrl: row.image_data_url,
    reviewMode,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function readReviews(): Promise<StoredReview[]> {
  await ensureSchema();

  const rows = await withClient(async (client) => {
    const { rows } = await client.sql<ReviewRow>`
      SELECT
        r.id          AS review_id,
        r.playlist_id,
        r.playlist_name,
        r.playlist_owner,
        r.playlist_image,
        r.image_data_url,
        r.review_mode,
        r.created_at,
        a.id          AS album_row_id,
        a.album_id,
        a.position,
        a.name        AS album_name,
        a.artist,
        a.image       AS album_image,
        a.release_date,
        a.label,
        a.notes,
        a.rating,
        a.spotify_url
      FROM reviews r
      LEFT JOIN review_albums a ON a.review_id = r.id
      ORDER BY r.created_at DESC, a.position ASC;
    `;
    return rows;
  });

  const grouped = new Map<string, StoredReview>();

  for (const row of rows) {
    let review = grouped.get(row.review_id);
    if (!review) {
      review = mapRowToReview(row);
      grouped.set(row.review_id, review);
    }

    const album = mapRowToAlbum(row);
    if (album) {
      review.albums.push(album);
    }
  }

  return Array.from(grouped.values());
}

export async function addReview(input: ReviewInput): Promise<StoredReview> {
  await ensureSchema();

  const reviewId = randomUUID();
  const createdAt = new Date();

  await withClient(async (client) => {
    await client.sql`BEGIN`;

    try {
      await client.sql`
        INSERT INTO reviews (
          id,
          playlist_id,
          playlist_name,
          playlist_owner,
          playlist_image,
          image_data_url,
          review_mode,
          created_at
        ) VALUES (
          ${reviewId}::uuid,
          ${input.playlistId},
          ${input.playlistName},
          ${input.playlistOwner},
          ${input.playlistImage},
          ${input.imageDataUrl},
          ${input.reviewMode},
          ${createdAt.toISOString()}::timestamptz
        );
      `;

      for (let position = 0; position < input.albums.length; position += 1) {
        const album = input.albums[position];
        await client.sql`
          INSERT INTO review_albums (
            id,
            review_id,
            album_id,
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
            ${reviewId}::uuid,
            ${album.id},
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
    id: reviewId,
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    playlistOwner: input.playlistOwner,
    playlistImage: input.playlistImage,
    albums: input.albums,
    imageDataUrl: input.imageDataUrl,
    reviewMode: input.reviewMode,
    createdAt: createdAt.toISOString(),
  } satisfies StoredReview;
}

export async function getReviewById(id: string): Promise<StoredReview | null> {
  await ensureSchema();

  const rows = await withClient(async (client) => {
    const { rows } = await client.sql<ReviewRow>`
      SELECT
        r.id          AS review_id,
        r.playlist_id,
        r.playlist_name,
        r.playlist_owner,
        r.playlist_image,
        r.image_data_url,
        r.review_mode,
        r.created_at,
        a.id          AS album_row_id,
        a.album_id,
        a.position,
        a.name        AS album_name,
        a.artist,
        a.image       AS album_image,
        a.release_date,
        a.label,
        a.notes,
        a.rating,
        a.spotify_url
      FROM reviews r
      LEFT JOIN review_albums a ON a.review_id = r.id
      WHERE r.id = ${id}::uuid
      ORDER BY a.position ASC;
    `;
    return rows;
  });

  if (rows.length === 0) {
    return null;
  }

  const review = mapRowToReview(rows[0]);
  for (const row of rows) {
    const album = mapRowToAlbum(row);
    if (album) {
      review.albums.push(album);
    }
  }

  return review;
}

export async function deleteReviewById(id: string): Promise<boolean> {
  await ensureSchema();

  const affectedRows = await withClient(async (client) => {
    const result = await client.sql`
      DELETE FROM reviews
      WHERE id = ${id}::uuid;
    `;
    return result.rowCount ?? 0;
  });

  return affectedRows > 0;
}
