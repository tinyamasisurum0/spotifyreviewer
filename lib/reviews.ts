import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

export interface StoredAlbum {
  id: string;
  name: string;
  artist: string;
  image: string | null;
  releaseDate: string;
  notes: string;
  rating: number | null;
  spotifyUrl: string | null;
}

export interface StoredReview {
  id: string;
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  albums: StoredAlbum[];
  imageDataUrl: string | null;
  createdAt: string;
}

export interface ReviewInput {
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  albums: StoredAlbum[];
  imageDataUrl: string | null;
}

async function ensureFilePresence() {
  try {
    await fs.access(REVIEWS_FILE);
  } catch {
    await fs.mkdir(path.dirname(REVIEWS_FILE), { recursive: true });
    await fs.writeFile(REVIEWS_FILE, '[]', 'utf-8');
  }
}

export async function readReviews(): Promise<StoredReview[]> {
  await ensureFilePresence();
  const raw = await fs.readFile(REVIEWS_FILE, 'utf-8');
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map((item) => {
        const review = item as StoredReview & { playlistImage?: unknown };
        return {
          ...review,
          playlistImage: typeof review.playlistImage === 'string' ? review.playlistImage : null,
        } satisfies StoredReview;
      });
    }
    return [];
  } catch {
    return [];
  }
}

export async function addReview(input: ReviewInput): Promise<StoredReview> {
  const current = await readReviews();
  const newReview: StoredReview = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  current.push(newReview);
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  return newReview;
}

export async function getReviewById(id: string): Promise<StoredReview | null> {
  const reviews = await readReviews();
  return reviews.find((review) => review.id === id) ?? null;
}

export async function deleteReviewById(id: string): Promise<boolean> {
  const reviews = await readReviews();
  const next = reviews.filter((review) => review.id !== id);
  if (next.length === reviews.length) {
    return false;
  }
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return true;
}
