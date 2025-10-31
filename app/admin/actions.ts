"use server";

import { revalidatePath } from 'next/cache';
import { deleteReviewById } from '@/lib/reviews';

export async function deleteReview(id: string) {
  if (!id) {
    throw new Error('Missing review id.');
  }
  const deleted = await deleteReviewById(id);
  if (!deleted) {
    throw new Error('Review not found.');
  }
  revalidatePath('/admin');
  revalidatePath('/reviews');
}
