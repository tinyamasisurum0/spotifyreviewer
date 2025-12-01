"use server";

import { revalidatePath } from 'next/cache';
import { deleteReviewById } from '@/lib/reviews';
import { deleteTierListById } from '@/lib/tierLists';

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

export async function deleteTierList(id: string) {
  if (!id) {
    throw new Error('Missing tier list id.');
  }
  const deleted = await deleteTierListById(id);
  if (!deleted) {
    throw new Error('Tier list not found.');
  }
  revalidatePath('/admin');
  revalidatePath('/tier-lists');
}
