import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ReviewInput, StoredReview, ReviewMode } from '@/types/review';

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

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
        const review = item as StoredReview & {
          playlistImage?: unknown;
          reviewMode?: unknown;
        };
        const allowedModes: ReviewMode[] = ['review', 'plain', 'rating', 'both'];
        const inferredMode =
          typeof review.reviewMode === 'string' && allowedModes.includes(review.reviewMode as ReviewMode)
            ? (review.reviewMode as ReviewMode)
            : 'review';
        return {
          ...review,
          playlistImage: typeof review.playlistImage === 'string' ? review.playlistImage : null,
          reviewMode: inferredMode,
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
